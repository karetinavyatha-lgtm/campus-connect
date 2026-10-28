import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * CampusConnect – Java back end (JDK only, no external libraries).
 *
 * Serves the web front end from ./public and exposes a small REST API:
 *   POST /api/login            form body: role, username, password -> JSON {token,name,role}
 *   GET  /api/data/{name}      returns the stored JSON for complaints | students | events
 *   PUT  /api/data/{name}      replaces it (needs "Authorization: Bearer <token>")
 *   POST /api/logout
 *
 * Collections are saved as JSON files in ./data, so changes survive restarts.
 * Run:  java src/CampusConnectServer.java     (Java 11+)   then open http://localhost:8080
 */
public class CampusConnectServer {

    static final Path PUBLIC_DIR = Paths.get("public").toAbsolutePath().normalize();
    static final Path DATA_DIR = Paths.get("data").toAbsolutePath().normalize();
    static final Set<String> COLLECTIONS = Set.of("complaints", "students", "events");

    /** Demo accounts. Replace with a database lookup + hashed passwords for production. */
    record User(String role, String username, String password, String displayName) {}
    static final List<User> USERS = List.of(
        new User("student", "21CS101", "student123", "Rahul Sharma"),
        new User("admin", "admin", "admin123", "Admin"),
        new User("worker", "ramesh", "worker123", "Ramesh"));

    /** Who may write which collection. */
    static final Map<String, Set<String>> WRITE_ACCESS = Map.of(
        "complaints", Set.of("student", "admin", "worker"),
        "students", Set.of("admin"),
        "events", Set.of("admin"));

    static final Map<String, User> SESSIONS = new ConcurrentHashMap<>();
    static final SecureRandom RANDOM = new SecureRandom();

    public static void main(String[] args) throws IOException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        Files.createDirectories(DATA_DIR);
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api/login", CampusConnectServer::login);
        server.createContext("/api/logout", CampusConnectServer::logout);
        server.createContext("/api/data/", CampusConnectServer::data);
        server.createContext("/", CampusConnectServer::staticFile);
        server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(8));
        server.start();
        System.out.println("CampusConnect running at http://localhost:" + port);
        System.out.println("Demo logins: 21CS101/student123, admin/admin123, ramesh/worker123");
    }

    /* ---------------- API ---------------- */

    static void login(HttpExchange ex) throws IOException {
        if (!ex.getRequestMethod().equals("POST")) { send(ex, 405, "text/plain", "Method not allowed"); return; }
        Map<String, String> form = parseForm(new String(ex.getRequestBody().readNBytes(10_000), StandardCharsets.UTF_8));
        String role = form.getOrDefault("role", ""), user = form.getOrDefault("username", ""), pass = form.getOrDefault("password", "");
        for (User u : USERS) {
            if (u.role().equals(role) && u.username().equalsIgnoreCase(user) && u.password().equals(pass)) {
                String token = newToken();
                SESSIONS.put(token, u);
                send(ex, 200, "application/json", "{\"token\":\"" + token + "\",\"name\":\"" + jsonEsc(u.displayName())
                        + "\",\"role\":\"" + u.role() + "\",\"id\":\"" + jsonEsc(u.username()) + "\"}");
                return;
            }
        }
        send(ex, 401, "application/json", "{\"error\":\"Wrong username or password for this role.\"}");
    }

    static void logout(HttpExchange ex) throws IOException {
        String t = bearer(ex);
        if (t != null) SESSIONS.remove(t);
        send(ex, 204, "text/plain", "");
    }

    static void data(HttpExchange ex) throws IOException {
        String name = ex.getRequestURI().getPath().substring("/api/data/".length());
        if (!COLLECTIONS.contains(name)) { send(ex, 404, "application/json", "{\"error\":\"Unknown collection\"}"); return; }
        String tk = bearer(ex);
        User who = tk == null ? null : SESSIONS.get(tk);
        if (who == null) { send(ex, 401, "application/json", "{\"error\":\"Please log in.\"}"); return; }
        Path file = DATA_DIR.resolve(name + ".json");

        switch (ex.getRequestMethod()) {
            case "GET" -> {
                if (Files.exists(file)) send(ex, 200, "application/json", Files.readString(file));
                else send(ex, 204, "application/json", "");   // nothing saved yet: client uses its starter data
            }
            case "PUT" -> {
                if (!WRITE_ACCESS.get(name).contains(who.role())) { send(ex, 403, "application/json", "{\"error\":\"Not allowed for your role.\"}"); return; }
                String body = new String(ex.getRequestBody().readNBytes(1_000_000), StandardCharsets.UTF_8).trim();
                if (!body.startsWith("[") || !body.endsWith("]")) { send(ex, 400, "application/json", "{\"error\":\"Expected a JSON array.\"}"); return; }
                synchronized (CampusConnectServer.class) {
                    Path tmp = Files.createTempFile(DATA_DIR, name, ".tmp");
                    Files.writeString(tmp, body);
                    Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING);
                }
                send(ex, 204, "application/json", "");
            }
            default -> send(ex, 405, "text/plain", "Method not allowed");
        }
    }

    /* ---------------- static files ---------------- */

    static void staticFile(HttpExchange ex) throws IOException {
        if (!ex.getRequestMethod().equals("GET")) { send(ex, 405, "text/plain", "Method not allowed"); return; }
        String path = URLDecoder.decode(ex.getRequestURI().getPath(), StandardCharsets.UTF_8);
        if (path.equals("/")) path = "/index.html";
        Path file = PUBLIC_DIR.resolve(path.substring(1)).normalize();
        if (!file.startsWith(PUBLIC_DIR) || !Files.isRegularFile(file)) { send(ex, 404, "text/plain", "Not found"); return; }
        byte[] bytes = Files.readAllBytes(file);
        ex.getResponseHeaders().set("Content-Type", mime(file.toString()));
        ex.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = ex.getResponseBody()) { os.write(bytes); }
    }

    /* ---------------- helpers ---------------- */

    static String mime(String f) {
        if (f.endsWith(".html")) return "text/html; charset=utf-8";
        if (f.endsWith(".css")) return "text/css; charset=utf-8";
        if (f.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (f.endsWith(".svg")) return "image/svg+xml";
        if (f.endsWith(".png")) return "image/png";
        if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    static void send(HttpExchange ex, int code, String type, String body) throws IOException {
        byte[] b = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", type.startsWith("text") || type.contains("json") ? type + "; charset=utf-8" : type);
        if (code == 204) { ex.sendResponseHeaders(204, -1); ex.close(); return; }
        ex.sendResponseHeaders(code, b.length);
        try (OutputStream os = ex.getResponseBody()) { os.write(b); }
    }

    static String bearer(HttpExchange ex) {
        String h = ex.getRequestHeaders().getFirst("Authorization");
        return h != null && h.startsWith("Bearer ") ? h.substring(7) : null;
    }

    static String newToken() { byte[] b = new byte[24]; RANDOM.nextBytes(b); return HexFormat.of().formatHex(b); }

    static Map<String, String> parseForm(String s) {
        Map<String, String> m = new HashMap<>();
        for (String pair : s.split("&")) {
            int i = pair.indexOf('=');
            if (i > 0) m.put(URLDecoder.decode(pair.substring(0, i), StandardCharsets.UTF_8), URLDecoder.decode(pair.substring(i + 1), StandardCharsets.UTF_8));
        }
        return m;
    }

    static String jsonEsc(String s) { return s.replace("\\", "\\\\").replace("\"", "\\\""); }
}
