/* Seed / mock data for CampusConnect. Replace with real API calls later. */
const SEED = {
  student: { name: "Rahul Sharma", roll: "21CS101", hostel: "Boys Hostel, Block B" },
  workers: [
    { id: "w1", name: "Ramesh", skill: "Plumbing", phone: "98480 11223" },
    { id: "w2", name: "Suresh", skill: "Electrical", phone: "98480 44556" },
    { id: "w3", name: "Mahesh", skill: "Carpentry", phone: "98480 77889" }
  ],
  students: [
    { roll: "21CS101", name: "Rahul Sharma", branch: "CSE", year: 3, room: "B-204" },
    { roll: "21CS114", name: "Ananya Rao", branch: "CSE", year: 3, room: "G-110" },
    { roll: "21EC042", name: "Vikram Reddy", branch: "ECE", year: 3, room: "A-101" },
    { roll: "22ME017", name: "Sneha Patel", branch: "MECH", year: 2, room: "C-312" }
  ],
  complaints: [
    { id: 3, date: "2026-10-10", type: "Water Leakage", location: "Block B - Room 204", status: "In Progress", worker: "w1", rating: null, desc: "Tap leaking in bathroom." },
    { id: 2, date: "2026-10-05", type: "Electrical Issue", location: "Block A - Room 101", status: "Resolved", worker: "w2", rating: null, desc: "Fan not working." },
    { id: 1, date: "2026-10-02", type: "Plumbing", location: "Block C - Room 312", status: "Resolved", worker: "w1", rating: 4, desc: "Blocked drain." }
  ],
  attendance: [
    { subject: "Java", attended: 36, total: 45 },
    { subject: "English", attended: 32, total: 45 },
    { subject: "DAA", attended: 40, total: 48 },
    { subject: "Mathematics", attended: 30, total: 45 },
    { subject: "Electronics", attended: 38, total: 45 }
  ],
  results: [
    { subject: "Java", internal: 24, external: 62, grade: "A" },
    { subject: "English", internal: 21, external: 55, grade: "B+" },
    { subject: "DAA", internal: 25, external: 68, grade: "A+" },
    { subject: "Mathematics", internal: 18, external: 49, grade: "B" },
    { subject: "Electronics", internal: 22, external: 58, grade: "A" }
  ],
  courses: [
    { code: "CS301", name: "Java Programming", credits: 4, topics: "OOP, Collections, Streams, JDBC" },
    { code: "CS302", name: "Design & Analysis of Algorithms", credits: 4, topics: "Divide & Conquer, DP, Greedy, NP" },
    { code: "MA301", name: "Mathematics III", credits: 3, topics: "Laplace, Fourier, Probability" },
    { code: "EC305", name: "Electronics", credits: 3, topics: "Diodes, BJT, Op-amps" },
    { code: "HS301", name: "English Communication", credits: 2, topics: "Writing, Presentation, Group discussion" }
  ],
  papers: [
    { subject: "Java", year: "2025", term: "End Semester" },
    { subject: "DAA", year: "2025", term: "End Semester" },
    { subject: "Mathematics", year: "2024", term: "Mid Semester" },
    { subject: "Electronics", year: "2024", term: "End Semester" }
  ],
  timetable: {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    slots: ["9:00", "10:00", "11:15", "12:15", "2:00"],
    grid: [
      ["Java", "DAA", "Maths", "Break", "Electronics"],
      ["English", "Java", "DAA", "Break", "Lab"],
      ["Maths", "Electronics", "Java", "Break", "Lab"],
      ["DAA", "English", "Maths", "Break", "Java"],
      ["Electronics", "Maths", "English", "Break", "Seminar"]
    ]
  },
  assignments: [
    { subject: "Java", title: "Library management mini-project", due: "2026-11-05", done: false },
    { subject: "DAA", title: "Dynamic programming problem set", due: "2026-11-02", done: false },
    { subject: "Mathematics", title: "Fourier series worksheet", due: "2026-10-30", done: true }
  ],
  events: [
    { id: 1, kind: "college", title: "Tech Fest 2026", date: "2026-11-15", time: "9:00 AM", place: "College Ground", hue: 265, info: "Hackathon, robotics arena, project expo and guest talks." },
    { id: 2, kind: "college", title: "Cultural Fest", date: "2026-11-22", time: "6:00 PM", place: "Auditorium", hue: 20, info: "Dance, music and drama performances by all branches." },
    { id: 3, kind: "college", title: "Sports Day", date: "2026-11-25", time: "8:00 AM", place: "Sports Ground", hue: 140, info: "Track and field, cricket and volleyball finals." },
    { id: 4, kind: "hostel", title: "Hostel Freshers Party", date: "2026-11-10", time: "6:00 PM", place: "Boys Hostel Common Room", hue: 330, info: "Welcome evening for first-year hostel residents." }
  ],
  announcements: [
    { date: "2026-10-27", text: "Mid-semester results will be published on 3 November." },
    { date: "2026-10-25", text: "Hostel water supply will be off on Sunday, 10 AM–1 PM." },
    { date: "2026-10-20", text: "Library hours extended to 10 PM during exam weeks." }
  ],
  issueTypes: ["Water Leakage", "Electrical Issue", "Plumbing", "Furniture", "Cleaning", "Internet / Wi-Fi", "Other"]
};
