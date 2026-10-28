# CampusConnect – Java edition

The same CampusConnect web app, now served by a Java back end that uses only the JDK (no Maven/Gradle, no libraries).

## Run
Requires Java 11 or newer.

    ./run.sh            (Windows: run.bat)
    # then open http://localhost:8080

Pick another port with `./run.sh 9000` or the `PORT` environment variable.

## Demo logins
| Role    | Username | Password   |
|---------|----------|------------|
| Student | 21CS101  | student123 |
| Admin   | admin    | admin123   |
| Worker  | ramesh   | worker123  |

## What the Java server does
- `src/CampusConnectServer.java` serves the front end from `public/`.
- `POST /api/login` checks role, username and password and returns a session token.
- `GET/PUT /api/data/{complaints|students|events}` reads and saves data as JSON files in `data/`.
  Writes need a valid token and the right role: students and workers can update complaints; only admins can change students and events.
- `POST /api/logout` ends the session.

## Before real use
- Accounts are hard-coded in `USERS`. Move them to a database and store hashed passwords.
- Sessions are kept in memory and are lost when the server restarts.
- Data is saved by replacing the whole collection, so two people editing at once can overwrite each other.
- The server uses plain HTTP. Put it behind HTTPS when deployed.

## Layout
    src/CampusConnectServer.java   Java server
    public/                        HTML, CSS, JS front end
    data/                          saved JSON (created at runtime)
