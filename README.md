# AttendAI

**Anti-proxy class attendance with in-browser face recognition and campus geofencing.**

Proxy attendance, where one student answers for an absent friend, is hard to catch with roll calls or sign-in sheets. AttendAI makes each student verify their own attendance: they scan their face on their own device while physically on campus. Teachers watch check-ins arrive live, and suspicious attempts are flagged for review rather than silently accepted.

The project was built for BMS College of Engineering (BMSCE). The campus coordinates, email domain and demo data reflect that, and all of them are configurable.

---

## Features

**Students**

- Enrol their face once from the profile page (5 samples captured from the webcam).
- Mark attendance for an active class session with a live face scan and GPS location.
- See per-subject attendance percentages, recent activity and notifications (absent alerts, low-attendance warnings).

**Teachers**

- Create subjects and enrol students (bulk paste of enrolment IDs or emails).
- Start and close attendance sessions; see check-ins appear in real time (Server-Sent Events).
- Review flagged records and manually override a status, with a recorded reason.
- Per-student attendance statistics for each subject.

**Administrators**

- Manage students and teachers, register users, deactivate accounts.
- Tune system rules: face-match threshold, attendance window, late threshold, minimum attendance %, geofence centre and radius.
- Dashboard with institution-wide counts, today's attendance rate and proxy attempts.

**Anti-proxy checks**

- **Server-side face matching.** The browser computes a 128-dimensional face descriptor with face-api.js. The API compares it with the student's enrolled samples (euclidean distance) and decides the outcome, so a client cannot submit its own match score.
- **Geofencing.** The haversine distance from the campus centre must be within the configured radius. Off-campus attempts are marked `proxy_detected`; a missing location is flagged for review.
- **Time window.** Check-ins are only accepted while the session is open and within the attendance window. Late arrivals are marked `late`.
- **One mark per student per session**, enforced by a database unique constraint.
- Teachers are notified of proxy attempts. Students who never check in are marked absent automatically when the session closes, either by the teacher or by a cron job once the window expires.

## Tech stack

| Layer    | Technology                                                                           |
| -------- | ------------------------------------------------------------------------------------ |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, React Router, date-fns         |
| Face AI  | face-api.js (TinyFaceDetector, 68-point landmarks, FaceRecognitionNet), in-browser   |
| Backend  | Node.js, Express 5, TypeScript (run with `tsx`), Zod validation, JWT auth, bcrypt    |
| Database | PostgreSQL via Drizzle ORM (Neon serverless driver for Neon, `pg` for anything else) |
| Jobs     | node-cron (session-token rotation, auto-closing expired sessions)                    |
| Tooling  | Vitest + Supertest, ESLint, Prettier, GitHub Actions                                 |

## Architecture

```
┌────────────────────────── Browser (React SPA) ───────────────────────────┐
│  Webcam ─▶ face-api.js ─▶ 128-d descriptor        Geolocation API        │
│                     │                                   │                │
│                     └──── POST /api/attendance/mark ────┘                │
│  Teacher view  ◀──── SSE /api/sse/session/:id (live check-ins) ────┐     │
└────────────────────────────────────────────────────────────────────┼─────┘
                                                                     │
┌──────────────────────────── Express API ───────────────────────────┼─────┐
│  authenticate (JWT) ─▶ requireRole ─▶ zod validation ─▶ route      │     │
│                                                                    │     │
│  lib/face.ts         best match vs. enrolled descriptors           │     │
│  lib/geo.ts          haversine geofence check                      │     │
│  lib/attendance.ts   present / late / proxy_detected rules         │     │
│  services/*          DB access, session closing, notifications ────┘     │
│  jobs/*              cron: rotate session tokens, close expired sessions │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │ Drizzle ORM
                          PostgreSQL (Neon or any Postgres)
```

The attendance rules live in `server/lib` as pure functions with no I/O, so they are unit tested directly. Routes stay thin: they authorise, validate, load data, call the rules and persist the result.

**Data model:** `users`, `subjects`, `subject_enrollments`, `attendance_sessions`, `attendance_records`, `notifications`, `system_settings` (a single `global` row) and `audit_logs`. See [`server/db/schema.ts`](server/db/schema.ts).

## Getting started

### Prerequisites

- Node.js **20.19+** (22 recommended)
- A PostgreSQL database: a free [Neon](https://neon.tech) project, or local Postgres 14+
- A webcam and an HTTPS origin (or `localhost`) for camera and geolocation access

### Setup

```bash
git clone https://github.com/jeevithg090/Attendance-AI.git
cd Attendance-AI
npm install

cp .env.example .env
# Edit .env: set DATABASE_URL and a JWT_SECRET of 32+ characters, e.g.
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

npm run db:push    # create tables from the Drizzle schema
npm run db:seed    # global settings + demo admin/teacher/student/subject

npm run dev        # Vite on :5173 and the API on :3001
```

Open http://localhost:5173. In development, Vite proxies `/api` to the API, so `VITE_API_URL` can stay empty.

**Demo accounts** (created by `npm run db:seed` outside production):

| Role    | Email                  | Password      |
| ------- | ---------------------- | ------------- |
| Admin   | `admin@bmsce.ac.in`    | `Admin@123`   |
| Teacher | `teacher1@bmsce.ac.in` | `Teacher@123` |
| Student | `student1@bmsce.ac.in` | `Student@123` |

Set `SEED_*_PASSWORD` to choose other passwords; this is required when `NODE_ENV=production`. Set `VITE_SHOW_DEMO_LOGINS=true` to show one-click demo logins on the sign-in page.

**Trying the full flow:** sign in as the student and enrol your face from **Profile**. Then, as the teacher, start a session under **Take Attendance**. Back as the student, use **Mark Attendance**. To test from off campus, turn off geofencing (or move the campus centre) in **Settings** as the admin.

## Environment variables

| Variable                  | Required | Default       | Description                                                                     |
| ------------------------- | -------- | ------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`            | yes      | –             | Postgres connection string. `*.neon.tech` hosts use the Neon HTTP driver.       |
| `JWT_SECRET`              | yes      | –             | JWT signing secret, at least 32 characters.                                     |
| `JWT_EXPIRES_IN`          | no       | `7d`          | Token lifetime (`jsonwebtoken` format).                                         |
| `PORT`                    | no       | `3001`        | API port.                                                                       |
| `NODE_ENV`                | no       | `development` | `production` disables the localhost CORS origins and demo seed passwords.       |
| `FRONTEND_URL`            | prod     | –             | Comma-separated CORS origins, e.g. `https://your-app.vercel.app`.               |
| `TRUST_PROXY`             | no       | `0`           | Number of reverse proxies in front of the API (use `1` on Railway/Render).      |
| `ENABLE_CRON`             | no       | `true`        | `false` disables token rotation and automatic session closing.                  |
| `SEED_ADMIN_PASSWORD` etc | prod     | demo values   | Passwords for `npm run db:seed`.                                                |
| `VITE_API_URL`            | prod     | `/api`        | API base URL baked into the frontend build, e.g. `https://api.example.com/api`. |
| `VITE_APP_NAME`           | no       | `AttendAI`    | Shown in page titles.                                                           |
| `VITE_SHOW_DEMO_LOGINS`   | no       | `false`       | Show demo credentials on the login page.                                        |

> Don't set `NODE_ENV` in a local `.env`. Vite reads that file too, and `NODE_ENV=development` there produces a development (unminified) frontend build.

## Scripts

| Command               | What it does                                                   |
| --------------------- | -------------------------------------------------------------- |
| `npm run dev`         | Frontend (Vite) and API (`tsx watch`) together                 |
| `npm run build`       | Typecheck frontend and server, then build the SPA into `dist/` |
| `npm start`           | Run the API (`tsx server/index.ts`)                            |
| `npm test`            | Vitest unit and HTTP tests (no database needed)                |
| `npm run lint`        | ESLint                                                         |
| `npm run format`      | Prettier (`format:check` to verify)                            |
| `npm run typecheck`   | `tsc` for the frontend and the server                          |
| `npm run db:push`     | Sync the schema to the database                                |
| `npm run db:generate` | Generate SQL migrations into `drizzle/migrations`              |
| `npm run db:migrate`  | Apply generated migrations                                     |
| `npm run db:seed`     | Seed settings and demo users (idempotent)                      |
| `npm run db:clear`    | Delete sessions, records, notifications and audit logs         |
| `npm run db:studio`   | Open Drizzle Studio                                            |

## Testing

```bash
npm test
```

The suite covers the geofence maths, descriptor matching, attendance status rules, request validation and the HTTP layer. The HTTP tests use Supertest against the real Express app with an in-memory database stub, and check authentication, role and ownership checks, input validation and the mark-attendance flow.

CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, tests and the production build on every push and pull request. A second job then starts a Postgres 16 service, pushes the schema, seeds it, boots the API and checks the health and login endpoints.

## Deployment

The frontend and API deploy separately.

**API (e.g. Railway, Render, Fly.io)**

1. Build command: `npm install` (the API runs TypeScript directly with `tsx`, so it has no compile step).
2. Start command: `npm start`.
3. Set `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL=<your frontend origin>` and `TRUST_PROXY=1`.
4. Run `npm run db:push` once against the production database, then `npm run db:seed` with `SEED_*_PASSWORD` set.
5. Run a single instance, or set `ENABLE_CRON=false` on all but one instance. The cron jobs and the SSE connection registry are per-process.

**Frontend (Vercel)**

1. Framework preset: Vite. Build command `npx vite build`, output directory `dist`.
2. Set `VITE_API_URL=https://<your-api-host>/api`.
3. `vercel.json` rewrites all paths to `index.html` for client-side routing.

Camera and geolocation access require HTTPS in production.

## Project structure

```
├── .github/workflows/ci.yml   CI: lint, typecheck, test, build, Postgres smoke test
├── public/models/             face-api.js model weights (served statically)
├── server/
│   ├── app.ts                 Express app factory (middleware + routes)
│   ├── index.ts               Entry point: HTTP listener, cron jobs, graceful shutdown
│   ├── config/env.ts          Zod-validated environment configuration
│   ├── db/                    Drizzle schema, connection, seed and cleanup scripts
│   ├── http/                  Error types/handler and request validation schemas
│   ├── jobs/                  Cron jobs (token rotation, expired-session cleanup)
│   ├── lib/                   Pure logic: face matching, geofencing, attendance rules
│   ├── middleware/            JWT authentication and role-based access control
│   ├── routes/                auth, users, subjects, sessions, attendance, notifications, settings, sse
│   └── services/              DB-backed business logic
├── src/
│   ├── api/client.ts          Axios client with JWT interceptor and error helper
│   ├── components/            Layout (sidebar, navbar), UI primitives, error boundary
│   ├── hooks/                 Face recognition, SSE, attendance data, document title
│   ├── pages/                 auth / student / teacher / admin / shared pages
│   ├── store/                 Zustand stores (auth, attendance)
│   └── types/                 Shared frontend types
├── tests/                     Vitest suites (server logic + HTTP, web helpers)
├── drizzle.config.ts
└── vite.config.ts
```

## Security notes and limitations

- **Face matching is not liveness detection.** Descriptors come from a single webcam frame. The only anti-spoofing check is a minimum face size, so a high-quality photo or video of the enrolled student could pass. Geofencing and teacher review reduce the risk, but they don't remove it.
- **Descriptors are computed in the browser.** The server decides whether a descriptor matches, but it can't prove the descriptor came from a live camera.
- **Rotating session tokens** are generated and refreshed every minute, but check-in doesn't require them yet. They are groundwork for QR-code check-in.
- **Biometric data:** enrolled face descriptors are stored in Postgres (`users.face_descriptors`) and are never returned by the API. Treat the database as sensitive and get consent from students before enrolling faces.
- JWTs are stored in `localStorage`. If the frontend is ever exposed to XSS, consider moving to httpOnly cookies.
