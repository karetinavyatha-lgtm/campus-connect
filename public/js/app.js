/* CampusConnect – single-page app (vanilla JS, hash routing, localStorage) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = d => new Date(d + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  /* ---------- storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("cc_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("cc_" + k, JSON.stringify(v)); } catch {} }
  };
  /* Data is loaded from, and saved to, the Java server (see CampusConnectServer.java). */
  const cache = {};
  const token = () => store.get("token", "");
  const authHeaders = () => ({ Authorization: "Bearer " + token() });
  const dbGet = (n, seed) => (cache[n] !== undefined ? cache[n] : seed);
  const dbSet = (n, v) => {
    cache[n] = v;
    fetch("/api/data/" + n, { method: "PUT", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(v) })
      .then(r => { if (r.status === 401) { toast("Session expired. Please log in again."); doLogout(); } else if (!r.ok) toast("Could not save that change."); })
      .catch(() => toast("Server unreachable. Change not saved."));
  };
  const db = {
    get complaints() { return dbGet("complaints", SEED.complaints); }, set complaints(v) { dbSet("complaints", v); },
    get students() { return dbGet("students", SEED.students); }, set students(v) { dbSet("students", v); },
    get events() { return dbGet("events", SEED.events); }, set events(v) { dbSet("events", v); }
  };
  async function loadData() {
    for (const n of ["complaints", "students", "events"]) {
      try {
        const r = await fetch("/api/data/" + n, { headers: authHeaders() });
        if (r.status === 401) return doLogout();
        if (r.status === 200) cache[n] = await r.json();
      } catch { toast("Server unreachable. Showing starter data."); }
    }
  }
  function doLogout() { fetch("/api/logout", { method: "POST", headers: authHeaders() }).catch(() => {}); user = null; store.set("user", null); store.set("token", ""); location.hash = "#/role"; }
  let user = store.get("user", null);
  const workerName = id => (SEED.workers.find(w => w.id === id) || {}).name || "–";

  /* ---------- helpers ---------- */
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200); }
  function badge(s) { const c = { "In Progress": "b-prog", Resolved: "b-done", Assigned: "b-assigned", New: "b-new" }[s] || "b-assigned"; return `<span class="badge ${c}">${esc(s)}</span>`; }
  function modal(html, onMount) {
    const root = $("#modal-root");
    root.innerHTML = `<div class="overlay" data-close><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
    root.querySelector(".overlay").addEventListener("click", e => { if (e.target.hasAttribute("data-close")) closeModal(); });
    root.querySelectorAll("[data-cancel]").forEach(b => b.addEventListener("click", closeModal));
    const f = root.querySelector("input,select,textarea,button"); if (f) f.focus();
    onMount && onMount(root);
  }
  function closeModal() { $("#modal-root").innerHTML = ""; }
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  const NAV = {
    student: [["home", "🏠", "Home", "#/home"], ["hostel", "🔧", "Hostel Issues", "#/hostel"], ["academics", "🎓", "Academics", "#/academics"], ["events", "📅", "Events", "#/events"], ["map", "📍", "Campus Map", "#/map"]],
    admin: [["admin", "🏠", "Admin Dashboard", "#/admin"], ["students", "👥", "Students", "#/students"], ["complaints", "📋", "Complaints", "#/complaints"], ["events", "📅", "Events", "#/events"], ["academics", "🎓", "Academics", "#/academics"]],
    worker: [["worker", "🏠", "Worker Dashboard", "#/worker"], ["tasks", "📋", "Assigned Complaints", "#/tasks"], ["profile", "👤", "Profile", "#/profile"]]
  };

  function shell(active, title, sub, body) {
    const items = NAV[user.role].map(([id, ic, label, href]) =>
      `<a class="nav-item ${id === active ? "active" : ""}" href="${href}" ${id === active ? 'aria-current="page"' : ""}><span class="i">${ic}</span>${label}</a>`).join("");
    app.innerHTML = `
    <div class="shell">
      <nav class="side" id="side" aria-label="Main">
        <div class="logo"><span style="font-size:22px">🎓</span> CampusConnect</div>${items}
      </nav>
      <main class="main">
        <header class="topbar">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <button class="menu-btn" id="menu" aria-label="Open menu">☰</button>
            <div><h1>${title}</h1><p class="sub">${sub}</p></div>
          </div>
          <div class="who">
            <div class="av">${esc(user.name[0])}</div>
            <div><b>${esc(user.name)}</b><small>${esc(user.role[0].toUpperCase() + user.role.slice(1))}</small></div>
            <button class="btn ghost small" id="logout">Logout</button>
          </div>
        </header>
        ${body}
      </main>
    </div>`;
    $("#logout").onclick = doLogout;
    $("#menu").onclick = () => $("#side").classList.toggle("open");
  }

  /* ---------- auth screens ---------- */
  function viewRole() {
    app.innerHTML = `
    <div class="hero">
      <section class="hero-left">
        <div class="logo-mark">🎓</div><div class="brand">CampusConnect</div>
        <div class="tag">Your College, One Platform</div>
        <p class="sub">Access your hostel, academics, events, and campus services — all in one place.</p>
        <div class="skyline" aria-hidden="true">🏛️🌳🏫</div>
      </section>
      <section class="hero-right"><div class="role-panel"><h2>Select Your Role</h2>
        ${[["student", "🧑‍🎓", "Student", "Access your academic, hostel, events and more"], ["admin", "🛡️", "Admin", "Manage students, complaints, events and more"], ["worker", "👷", "Worker", "View assigned tasks and update work status"]]
          .map(([r, e, n, d]) => `<button class="role-card ${r}" data-role="${r}"><span class="ico">${e}</span><span><b>${n}</b><span class="d">${d}</span></span><span class="chev">›</span></button>`).join("")}
      </div></section>
    </div>`;
    app.querySelectorAll("[data-role]").forEach(b => b.onclick = () => location.hash = "#/login/" + b.dataset.role);
  }

  function viewLogin(role) {
    app.innerHTML = `
    <div class="login">
      <form class="login-form" id="lf" novalidate>
        <div class="login-brand">🎓 CampusConnect</div>
        <h1>Login</h1><p class="muted">Enter your credentials to continue (${esc(role)})</p><p class="muted" style="font-size:12px">Demo: ${{ student: "21CS101 / student123", admin: "admin / admin123", worker: "ramesh / worker123" }[role]}</p>
        <label class="field"><span>👤</span><input id="u" placeholder="Username / Roll No" autocomplete="username"></label>
        <label class="field"><span>🔒</span><input id="p" type="password" placeholder="Password" autocomplete="current-password"><button type="button" id="eye" aria-label="Show password">👁</button></label>
        <div class="error" id="err" role="alert"></div>
        <button class="btn block">Login</button>
        <a href="#/login/${role}" id="forgot" style="text-align:center;font-size:13px">Forgot password?</a>
        <a href="#/role" style="text-align:center;font-size:13px;color:var(--muted)">← Choose a different role</a>
      </form>
      <div class="login-photo" aria-hidden="true"><div class="tower"></div><div class="bld"></div>
        <div class="tree" style="left:6%"></div><div class="tree" style="right:8%;width:90px;height:110px"></div></div>
    </div>`;
    $("#eye").onclick = () => { const p = $("#p"); p.type = p.type === "password" ? "text" : "password"; };
    $("#forgot").onclick = e => { e.preventDefault(); toast("Password reset: contact the college office."); };
    $("#lf").onsubmit = async e => {
      e.preventDefault();
      const u = $("#u").value.trim(), p = $("#p").value;
      if (!u || !p) { $("#err").textContent = "Enter both your username and password."; return; }
      try {
        const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ role, username: u, password: p }) });
        const j = await r.json();
        if (!r.ok) { $("#err").textContent = j.error || "Login failed."; return; }
        user = { role: j.role, name: j.name, id: j.id };
        store.set("user", user); store.set("token", j.token);
        await loadData();
        location.hash = { student: "#/home", admin: "#/admin", worker: "#/worker" }[role];
      } catch { $("#err").textContent = "Cannot reach the server. Is it running?"; }
    };
  }

  /* ---------- student views ---------- */
  function viewHome() {
    const t = [["hostel", "🔧", "Hostel Issues", "Submit complaints and track status", "c-blue"], ["academics", "📖", "Academics", "View attendance, results, syllabus, timetable and more", "c-purple"], ["events", "🗓️", "Events", "College and hostel events, announcements", "c-red"], ["map", "📍", "Campus Map", "Explore campus blueprint and find locations", "c-green"]];
    shell("home", `Welcome, ${esc(user.name)}!`, "Good to see you back!", `
      <div class="grid g2">${t.map(([h, e, n, d, c]) => `<a href="#/${h}" style="text-decoration:none;color:inherit"><div class="tile"><div class="big ${c}">${e}</div><div><b>${n}</b><span class="d">${d}</span></div><span class="chev">›</span></div></a>`).join("")}</div>
      <div class="quote"><span>“Small steps every day lead to big results.”</span><span style="font-size:30px">🎓</span></div>`);
  }

  function complaintRows(list, withWorker) {
    return list.map(c => `<tr><td>${fmt(c.date)}</td><td>${esc(c.type)}</td><td>${esc(c.location)}</td><td>${badge(c.status)}</td>${withWorker ? `<td>${workerName(c.worker)}</td>` : ""}</tr>`).join("") || `<tr><td colspan="5" class="muted">No complaints yet. Choose “New Complaint” to raise one.</td></tr>`;
  }

  function viewHostel() {
    const all = db.complaints.slice().sort((a, b) => b.id - a.id);
    shell("hostel", "Hostel Issues", "Report issues, track progress and give feedback.", `
      <div class="grid g4" style="margin-bottom:22px">
        <button class="mini blue" data-a="new"><span class="e">➕</span><b>Submit Complaint</b><span>Raise a new complaint</span></button>
        <button class="mini purple" data-a="mine"><span class="e">📝</span><b>My Complaints</b><span>View your submitted complaints</span></button>
        <button class="mini green" data-a="workers"><span class="e">👷</span><b>Worker Details</b><span>View assigned worker and work status</span></button>
        <button class="mini orange" data-a="rate"><span class="e">⭐</span><b>Feedback &amp; Ratings</b><span>Rate completed work</span></button>
      </div>
      <div class="card"><div class="row"><h3>Recent Complaints</h3><a href="#/hostel" data-a="mine">View All</a></div>
        <div class="table-wrap"><table><thead><tr><th>Date</th><th>Issue Type</th><th>Location</th><th>Status</th></tr></thead><tbody>${complaintRows(all.slice(0, 3))}</tbody></table></div></div>
      <p style="margin-top:18px"><button class="btn" data-a="new">+ New Complaint</button></p>`);
    app.querySelectorAll("[data-a]").forEach(b => b.onclick = e => { e.preventDefault(); ({ new: newComplaint, mine: myComplaints, workers: workerDetails, rate: rateWork })[b.dataset.a](); });
  }
  function newComplaint() {
    modal(`<h2>Submit Complaint</h2>
      <label class="l" style="font-weight:600">Issue type</label><div class="field"><select id="t">${SEED.issueTypes.map(t => `<option>${t}</option>`).join("")}</select></div>
      <label class="l" style="font-weight:600;display:block;margin-top:12px">Location</label><div class="field"><input id="l" value="Block B - Room 204"></div>
      <label class="l" style="font-weight:600;display:block;margin-top:12px">Describe the problem</label><textarea id="d" placeholder="What is wrong?"></textarea>
      <div class="actions"><button class="btn ghost" data-cancel>Cancel</button><button class="btn" id="go">Submit complaint</button></div>`,
      r => r.querySelector("#go").onclick = () => {
        const loc = r.querySelector("#l").value.trim(); if (!loc) return toast("Enter a location.");
        const list = db.complaints; list.push({ id: Math.max(0, ...list.map(c => c.id)) + 1, date: new Date().toISOString().slice(0, 10), type: r.querySelector("#t").value, location: loc, status: "New", worker: null, rating: null, desc: r.querySelector("#d").value });
        db.complaints = list; closeModal(); toast("Complaint submitted."); route();
      });
  }
  function myComplaints() { modal(`<h2>My Complaints</h2><div class="table-wrap"><table><thead><tr><th>Date</th><th>Issue</th><th>Location</th><th>Status</th><th>Worker</th></tr></thead><tbody>${complaintRows(db.complaints.slice().sort((a, b) => b.id - a.id), true)}</tbody></table></div><div class="actions"><button class="btn" data-cancel>Close</button></div>`); }
  function workerDetails() {
    modal(`<h2>Worker Details</h2>${db.complaints.filter(c => c.worker).map(c => { const w = SEED.workers.find(x => x.id === c.worker); return `<div class="card" style="margin-bottom:10px"><b>${esc(c.type)}</b> ${badge(c.status)}<br><span class="muted">${esc(w.name)} · ${esc(w.skill)} · ${esc(w.phone)}</span></div>`; }).join("") || "<p class='muted'>No worker has been assigned yet.</p>"}<div class="actions"><button class="btn" data-cancel>Close</button></div>`);
  }
  function rateWork() {
    const done = db.complaints.filter(c => c.status === "Resolved" && !c.rating);
    if (!done.length) return modal(`<h2>Feedback &amp; Ratings</h2><p class="muted">You have no completed work waiting for a rating.</p><div class="actions"><button class="btn" data-cancel>Close</button></div>`);
    let stars = 0;
    modal(`<h2>Rate completed work</h2><div class="field"><select id="c">${done.map(c => `<option value="${c.id}">${esc(c.type)} – ${esc(c.location)}</option>`).join("")}</select></div>
      <div class="stars" id="st" style="margin:12px 0">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}" aria-label="${n} stars">★</button>`).join("")}</div>
      <div class="actions"><button class="btn ghost" data-cancel>Cancel</button><button class="btn" id="go">Send rating</button></div>`, r => {
      r.querySelectorAll("#st button").forEach(b => b.onclick = () => { stars = +b.dataset.n; r.querySelectorAll("#st button").forEach(x => x.classList.toggle("on", +x.dataset.n <= stars)); });
      r.querySelector("#go").onclick = () => { if (!stars) return toast("Choose a star rating."); const l = db.complaints; l.find(c => c.id == r.querySelector("#c").value).rating = stars; db.complaints = l; closeModal(); toast("Thanks for your feedback."); };
    });
  }

  let acadTab = "attendance";
  function viewAcademics() {
    const tabs = [["attendance", "✔️", "Attendance"], ["results", "📊", "Results"], ["courses", "📚", "Courses & Syllabus"], ["papers", "📄", "Question Papers"], ["timetable", "🗓️", "Timetable"], ["assignments", "📝", "Assignments"]];
    const A = SEED.attendance, att = A.reduce((s, x) => s + x.attended, 0), tot = A.reduce((s, x) => s + x.total, 0), pct = Math.round(att / tot * 100);
    const pc = x => Math.round(x.attended / x.total * 100);
    const skip = Math.max(0, Math.floor(att / .75 - tot));
    const low = A.slice().sort((a, b) => pc(a) - pc(b))[0], need = Math.max(0, Math.ceil((.75 * low.total - low.attended) / .25));
    const panes = {
      attendance: `<div class="grid" style="grid-template-columns:1fr 2fr">
        <div class="card"><h3>Attendance Percentage</h3><div class="ring" style="--p:${pct}"><div>${pct}%</div></div><p class="safe ${pct >= 75 ? "ok" : "bad"}">${pct >= 75 ? "✔ You are safe!" : "⚠ Below 75%"}</p></div>
        <div class="card"><h3>Subject-wise Attendance</h3><div class="table-wrap"><table><thead><tr><th>Subject</th><th>Attended</th><th>Total</th><th>Percentage</th></tr></thead><tbody>${A.map(x => `<tr><td>${x.subject}</td><td>${x.attended}</td><td>${x.total}</td><td class="${pc(x) >= 80 ? "ok" : pc(x) >= 75 ? "warn" : "bad"}"><b>${pc(x)}%</b></td></tr>`).join("")}</tbody></table></div></div></div>
        <div class="grid g2" style="margin-top:16px"><div class="note green">✂️<div>You can skip<b>${skip} classes</b><span class="muted">and still maintain 75% attendance.</span></div></div>
        <div class="note blue">🎯<div>You need to attend<b>${need} consecutive classes</b><span class="muted">to reach 75% (for ${low.subject}).</span></div></div></div>`,
      results: `<div class="card table-wrap"><table><thead><tr><th>Subject</th><th>Internal /25</th><th>External /75</th><th>Total</th><th>Grade</th></tr></thead><tbody>${SEED.results.map(r => `<tr><td>${r.subject}</td><td>${r.internal}</td><td>${r.external}</td><td>${r.internal + r.external}</td><td><b>${r.grade}</b></td></tr>`).join("")}</tbody></table></div>`,
      courses: `<div class="grid g2">${SEED.courses.map(c => `<div class="card"><b>${c.code} · ${c.name}</b><p class="muted">${c.credits} credits</p><p style="margin-top:6px">${c.topics}</p></div>`).join("")}</div>`,
      papers: `<div class="card">${SEED.papers.map(p => `<div class="row"><span><b>${p.subject}</b> <span class="muted">${p.term}, ${p.year}</span></span><button class="btn ghost small" data-toast="Download will be available when connected to a server.">Download</button></div>`).join("")}</div>`,
      timetable: `<div class="card table-wrap"><table class="tt"><thead><tr><th></th>${SEED.timetable.slots.map(s => `<th>${s}</th>`).join("")}</tr></thead><tbody>${SEED.timetable.days.map((d, i) => `<tr><th>${d}</th>${SEED.timetable.grid[i].map(c => `<td class="${c === "Break" ? "brk" : ""}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
      assignments: `<div class="card">${SEED.assignments.map(a => `<div class="row"><span><b>${a.subject}</b> – ${a.title}<br><span class="muted">Due ${fmt(a.due)}</span></span>${a.done ? '<span class="badge b-done">Submitted</span>' : '<span class="badge b-prog">Pending</span>'}</div>`).join("")}</div>`
    };
    shell("academics", "Academics", "Your courses, attendance, syllabus, results and more.", `
      <div class="tabs icons" role="tablist">${tabs.map(([id, e, n]) => `<button role="tab" class="tab ${id === acadTab ? "active" : ""}" data-tab="${id}"><span style="font-size:18px">${e}</span>${n}</button>`).join("")}</div>${panes[acadTab]}`);
    app.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { acadTab = b.dataset.tab; viewAcademics(); });
    app.querySelectorAll("[data-toast]").forEach(b => b.onclick = () => toast(b.dataset.toast));
  }

  let evTab = "college";
  const evCard = e => `<div class="event"><div class="thumb" style="background:linear-gradient(135deg,hsl(${e.hue} 70% 45%),hsl(${e.hue + 40} 70% 30%))">${e.kind === "hostel" ? "🎉" : "🎪"}</div>
    <div class="meta"><b>${esc(e.title)}</b><br>📅 ${fmt(e.date)} · ${esc(e.time)}<br>📍 ${esc(e.place)}</div>
    <span class="chip ${e.kind}">${e.kind === "hostel" ? "Hostel Event" : "College Event"}</span>
    <button class="btn ghost small" data-ev="${e.id}">View Details</button></div>`;
  function viewEvents() {
    const list = db.events.filter(e => e.kind === evTab).sort((a, b) => a.date.localeCompare(b.date));
    const isAdmin = user.role === "admin";
    shell("events", "Events", "Stay updated with college and hostel events.", `
      <div class="row"><div class="tabs" style="margin:0"><button class="tab ${evTab === "college" ? "active" : ""}" data-t="college">College Events</button><button class="tab ${evTab === "hostel" ? "active" : ""}" data-t="hostel">Hostel Events</button></div>
        <div>${isAdmin ? '<button class="btn small" id="add">+ Add Event</button> ' : ""}<button class="btn ghost small" id="ann">📢 Announcements</button></div></div>
      ${list.map(evCard).join("") || '<p class="muted">No events yet.</p>'}`);
    app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { evTab = b.dataset.t; viewEvents(); });
    app.querySelectorAll("[data-ev]").forEach(b => b.onclick = () => { const e = db.events.find(x => x.id == b.dataset.ev); modal(`<h2>${esc(e.title)}</h2><p>${esc(e.info || "")}</p><p class="muted" style="margin-top:10px">📅 ${fmt(e.date)} · ${esc(e.time)}<br>📍 ${esc(e.place)}</p><div class="actions"><button class="btn" data-cancel>Close</button></div>`); });
    $("#ann").onclick = () => modal(`<h2>Announcements</h2>${SEED.announcements.map(a => `<div class="row"><span>${esc(a.text)}</span><span class="muted">${fmt(a.date)}</span></div>`).join("")}<div class="actions"><button class="btn" data-cancel>Close</button></div>`);
    if (isAdmin) $("#add").onclick = () => modal(`<h2>Add Event</h2>
      <div class="field"><input id="n" placeholder="Event title"></div><br>
      <div class="field"><select id="k"><option value="college">College event</option><option value="hostel">Hostel event</option></select></div><br>
      <div class="field"><input id="d" type="date"></div><br><div class="field"><input id="tm" placeholder="Time (e.g. 6:00 PM)"></div><br><div class="field"><input id="pl" placeholder="Place"></div>
      <div class="actions"><button class="btn ghost" data-cancel>Cancel</button><button class="btn" id="go">Add event</button></div>`, r => r.querySelector("#go").onclick = () => {
      const n = r.querySelector("#n").value.trim(), d = r.querySelector("#d").value; if (!n || !d) return toast("Add a title and date.");
      const l = db.events; l.push({ id: Date.now(), kind: r.querySelector("#k").value, title: n, date: d, time: r.querySelector("#tm").value || "TBA", place: r.querySelector("#pl").value || "TBA", hue: Math.floor(Math.random() * 300), info: "" });
      db.events = l; closeModal(); toast("Event added."); viewEvents();
    });
  }

  /* ---------- campus map ---------- */
  const PLACES = [
    { id: "Hostel (Boys)", x: 40, y: 40, w: 150, h: 90, fill: "#e8b4a0" },
    { id: "Academic Block", x: 230, y: 40, w: 150, h: 90, fill: "#e2a867" },
    { id: "Library", x: 420, y: 40, w: 140, h: 90, fill: "#c9a0dc" },
    { id: "Canteen", x: 60, y: 260, w: 110, h: 70, fill: "#f2c94c" },
    { id: "Sports Ground", x: 190, y: 250, w: 90, h: 80, fill: "#7bc67e" },
    { id: "Auditorium", x: 330, y: 270, w: 110, h: 70, fill: "#9fb7e8" },
    { id: "Hostel (Girls)", x: 460, y: 260, w: 110, h: 80, fill: "#e8b4a0" },
    { id: "Main Gate", x: 280, y: 372, w: 40, h: 20, fill: "#e5484d", gate: true }
  ];
  const ROAD_Y = 205, M_PER_PX = 1.1;
  function access(p) { const cx = p.x + p.w / 2; if (p.gate) return [[300, p.y], [300, ROAD_Y]]; return p.y < ROAD_Y ? [[cx, p.y + p.h], [cx, ROAD_Y]] : [[cx, p.y], [cx, ROAD_Y]]; }
  function routePts(a, b) { const A = access(a), B = access(b); return [...A, ...B.slice().reverse()]; }
  let mapState = { from: "Main Gate", to: "Library", show: true };
  function viewMap() {
    const opts = sel => PLACES.map(p => `<option ${p.id === sel ? "selected" : ""}>${p.id}</option>`).join("");
    shell("map", "Campus Map", "Explore your campus and find your way.", `
      <div class="map-layout">
        <div class="card"><h3>Find Location</h3><div class="field"><span>🔍</span><input id="q" placeholder="Search for a building..." list="pl"><datalist id="pl">${PLACES.map(p => `<option>${p.id}</option>`).join("")}</datalist></div>
          <label class="l">Select Destination</label><div class="field"><select id="to">${opts(mapState.to)}</select></div>
          <label class="l">Starting Point</label><div class="field"><select id="from">${opts(mapState.from)}</select></div>
          <p style="margin-top:14px"><button class="btn block" id="route">Show Route</button></p></div>
        <div><div class="map-box" id="mapbox"></div><p id="info" style="margin-top:10px"></p></div>
        <div class="legend card"><div><i style="background:#1d6fe8"></i>Route</div><div><i style="background:#e2a867"></i>Buildings</div><div><i style="background:#7bc67e"></i>Green Area</div><div><i style="background:#9aa3b2"></i>Roads</div><div style="font-size:28px;justify-content:center">🧭</div></div>
      </div>`);
    const draw = () => {
      const a = PLACES.find(p => p.id === mapState.from), b = PLACES.find(p => p.id === mapState.to);
      const pts = routePts(a, b), len = pts.slice(1).reduce((s, p, i) => s + Math.abs(p[0] - pts[i][0]) + Math.abs(p[1] - pts[i][1]), 0);
      const roads = PLACES.map(p => `<polyline points="${access(p).map(q => q.join(",")).join(" ")}" stroke="#9aa3b2" stroke-width="10" fill="none" stroke-linecap="round"/>`).join("");
      $("#mapbox").innerHTML = `<svg viewBox="0 0 600 410" role="img" aria-label="Campus map">
        <rect width="600" height="410" fill="#dff1d4"/>
        <line x1="20" y1="${ROAD_Y}" x2="580" y2="${ROAD_Y}" stroke="#9aa3b2" stroke-width="14" stroke-linecap="round"/>${roads}
        ${[[20, 150], [580, 160], [20, 360], [580, 380], [200, 160], [420, 165]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#4f9d4f"/>`).join("")}
        ${PLACES.filter(p => !p.gate).map(p => `<g><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="8" fill="${p.fill}" stroke="${p.id === b.id ? "#1d6fe8" : "rgba(0,0,0,.2)"}" stroke-width="${p.id === b.id ? 3 : 1}"/><text x="${p.x + p.w / 2}" y="${p.y + p.h / 2 + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#16233b">${p.id}</text></g>`).join("")}
        <rect x="280" y="372" width="40" height="20" rx="4" fill="#e5484d"/><text x="300" y="404" text-anchor="middle" font-size="12" font-weight="700" fill="#16233b">Main Gate</text>
        ${mapState.show && a !== b ? `<polyline points="${pts.map(q => q.join(",")).join(" ")}" fill="none" stroke="#1d6fe8" stroke-width="5" stroke-dasharray="1 9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="7" fill="#1d6fe8"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="8" fill="#e5484d"/>` : ""}</svg>`;
      const m = Math.round(len * M_PER_PX / 10) * 10, min = Math.max(1, Math.round(m / 80));
      $("#info").innerHTML = a === b ? "<span class='muted'>Choose two different locations.</span>" : `<b>Route:</b> ${a.id} → ${b.id}<br><span class="muted">Distance: ~${m} meters · Estimated walk: ${min} minutes</span>`;
    };
    $("#route").onclick = () => { mapState = { from: $("#from").value, to: $("#to").value, show: true }; draw(); };
    $("#q").onchange = e => { const p = PLACES.find(x => x.id.toLowerCase() === e.target.value.trim().toLowerCase()); if (p) { $("#to").value = p.id; mapState.to = p.id; draw(); } else toast("No building with that name."); };
    draw();
  }

  /* ---------- admin ---------- */
  function viewAdmin() {
    const cs = db.complaints.slice().sort((a, b) => b.id - a.id);
    shell("admin", "Admin Dashboard", "Manage students, complaints, events and more.", `
      <div class="grid g2" style="margin-bottom:22px">
        ${[["students", "👥", "Manage Students", "View and edit student details", "blue"], ["complaints", "📋", "Manage Complaints", "Assign workers and track status", "red"], ["events", "📅", "Manage Events", "Add or update events", "purple"], ["academics", "🎓", "Manage Academic", "Update courses, syllabus, timetable", "green"]]
          .map(([h, e, n, d, c]) => `<a href="#/${h}" style="text-decoration:none;color:inherit"><div class="tile"><div class="big c-${c === "red" ? "red" : c}" style="font-size:26px">${e}</div><div><b>${n}</b><span class="d">${d}</span></div></div></a>`).join("")}</div>
      <div class="card"><div class="row"><h3>Recent Complaints</h3><a href="#/complaints">View All</a></div>
      <div class="table-wrap"><table><thead><tr><th>Date</th><th>Issue</th><th>Location</th><th>Status</th><th>Assigned To</th></tr></thead><tbody>${complaintRows(cs.slice(0, 4), true)}</tbody></table></div></div>`);
  }
  function viewComplaints() {
    const cs = db.complaints.slice().sort((a, b) => b.id - a.id);
    shell("complaints", "Complaints", "Assign workers and track status.", `<div class="card table-wrap"><table><thead><tr><th>Date</th><th>Issue</th><th>Location</th><th>Status</th><th>Assign worker</th></tr></thead><tbody>
      ${cs.map(c => `<tr><td>${fmt(c.date)}</td><td>${esc(c.type)}</td><td>${esc(c.location)}</td><td>${badge(c.status)}</td><td><div class="field" style="padding:0 6px"><select data-id="${c.id}" aria-label="Assign worker"><option value="">Unassigned</option>${SEED.workers.map(w => `<option value="${w.id}" ${c.worker === w.id ? "selected" : ""}>${w.name} (${w.skill})</option>`).join("")}</select></div></td></tr>`).join("")}</tbody></table></div>`);
    app.querySelectorAll("select[data-id]").forEach(s => s.onchange = () => { const l = db.complaints, c = l.find(x => x.id == s.dataset.id); c.worker = s.value || null; if (c.worker && c.status === "New") c.status = "Assigned"; db.complaints = l; toast("Worker assigned."); viewComplaints(); });
  }
  function viewStudents() {
    shell("students", "Students", "View, add and remove student records.", `
      <p style="margin-bottom:12px"><button class="btn small" id="add">+ Add Student</button></p>
      <div class="card table-wrap"><table><thead><tr><th>Roll No</th><th>Name</th><th>Branch</th><th>Year</th><th>Room</th><th></th></tr></thead><tbody>${db.students.map(s => `<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.branch)}</td><td>${s.year}</td><td>${esc(s.room)}</td><td><button class="btn ghost small" data-del="${esc(s.roll)}">Remove</button></td></tr>`).join("")}</tbody></table></div>`);
    app.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { db.students = db.students.filter(s => s.roll !== b.dataset.del); toast("Student removed."); viewStudents(); });
    $("#add").onclick = () => modal(`<h2>Add Student</h2><div class="field"><input id="r" placeholder="Roll no"></div><br><div class="field"><input id="n" placeholder="Full name"></div><br><div class="field"><input id="b" placeholder="Branch"></div><br><div class="field"><input id="y" type="number" min="1" max="4" placeholder="Year"></div><br><div class="field"><input id="rm" placeholder="Hostel room"></div>
      <div class="actions"><button class="btn ghost" data-cancel>Cancel</button><button class="btn" id="go">Add student</button></div>`, r => r.querySelector("#go").onclick = () => {
      const v = id => r.querySelector("#" + id).value.trim(); if (!v("r") || !v("n")) return toast("Roll number and name are required.");
      const l = db.students; l.push({ roll: v("r"), name: v("n"), branch: v("b"), year: +v("y") || 1, room: v("rm") }); db.students = l; closeModal(); toast("Student added."); viewStudents();
    });
  }

  /* ---------- worker ---------- */
  const myTasks = () => db.complaints.filter(c => c.worker === "w1" || (user && c.worker && workerName(c.worker) === user.name));
  function taskTable(list) {
    return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Issue</th><th>Location</th><th>Status</th><th>Action</th></tr></thead><tbody>${list.map(c => `<tr><td>${fmt(c.date)}</td><td>${esc(c.type)}</td><td>${esc(c.location)}</td><td>${badge(c.status)}</td><td><button class="btn small" data-up="${c.id}">Update</button></td></tr>`).join("") || '<tr><td colspan="5" class="muted">No tasks assigned.</td></tr>'}</tbody></table></div>`;
  }
  function bindUpdate() {
    app.querySelectorAll("[data-up]").forEach(b => b.onclick = () => modal(`<h2>Update status</h2><div class="field"><select id="s"><option>Assigned</option><option>In Progress</option><option>Resolved</option></select></div><br><textarea id="nt" placeholder="Add a note (optional)"></textarea>
      <div class="actions"><button class="btn ghost" data-cancel>Cancel</button><button class="btn" id="go">Save status</button></div>`, r => {
      const c = db.complaints.find(x => x.id == b.dataset.up); r.querySelector("#s").value = c.status === "New" ? "Assigned" : c.status;
      r.querySelector("#go").onclick = () => { const l = db.complaints; l.find(x => x.id == c.id).status = r.querySelector("#s").value; db.complaints = l; closeModal(); toast("Status updated."); route(); };
    }));
  }
  function viewWorker() {
    shell("worker", "Worker Dashboard", "View and update your assigned tasks.", `
      <div class="card"><div class="row"><h3>Assigned Complaints</h3><a href="#/tasks">View All</a></div>${taskTable(myTasks().slice(0, 3))}</div>
      <h3 style="margin:22px 0 10px">Quick Actions</h3><div class="grid g4">
        <a class="mini blue" href="#/tasks" style="text-decoration:none;color:inherit"><span class="e">✅</span><b>Update Status</b></a>
        <a class="mini purple" href="#/tasks" style="text-decoration:none;color:inherit"><span class="e">🗒️</span><b>Add Notes</b></a>
        <a class="mini green" href="#/tasks" style="text-decoration:none;color:inherit"><span class="e">👁️</span><b>View Details</b></a>
        <a class="mini orange" href="#/profile" style="text-decoration:none;color:inherit"><span class="e">⭐</span><b>Give Feedback</b></a></div>`);
    bindUpdate();
  }
  function viewTasks() { shell("tasks", "Assigned Complaints", "Update the status of each job.", `<div class="card">${taskTable(myTasks())}</div>`); bindUpdate(); }
  function viewProfile() { const w = SEED.workers[0]; shell("profile", "Profile", "Your details.", `<div class="card"><h3>${esc(user.name)}</h3><p class="muted">Skill: ${w.skill}<br>Phone: ${w.phone}<br>Jobs done: ${db.complaints.filter(c => c.worker === "w1" && c.status === "Resolved").length}</p></div>`); }

  /* ---------- router ---------- */
  const ROUTES = {
    student: { home: viewHome, hostel: viewHostel, academics: viewAcademics, events: viewEvents, map: viewMap },
    admin: { admin: viewAdmin, students: viewStudents, complaints: viewComplaints, events: viewEvents, academics: viewAcademics },
    worker: { worker: viewWorker, tasks: viewTasks, profile: viewProfile }
  };
  const HOME = { student: "home", admin: "admin", worker: "worker" };
  function route() {
    const [, page, arg] = (location.hash || "#/role").split("/");
    if (page === "login" && ["student", "admin", "worker"].includes(arg)) return viewLogin(arg);
    if (!user || page === "role") { if (page !== "role") { location.hash = "#/role"; return; } return viewRole(); }
    const fn = ROUTES[user.role][page];
    if (!fn) { location.hash = "#/" + HOME[user.role]; return; }
    fn(); window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  (user && token() ? loadData() : Promise.resolve()).then(route);
})();
