# SSG Student Election System

End-to-end documentation for the school SSG voting platform: one **React website** carrying both the admin console and the student portal, plus the **backend API**.

---

## Table of contents

1. [What this system is](#1-what-this-system-is)
2. [Architecture](#2-architecture)
3. [Repository layout](#3-repository-layout)
4. [Prerequisites](#4-prerequisites)
5. [Quick start](#5-quick-start)
6. [Backend API](#6-backend-api)
7. [Admin web](#7-admin-web)
8. [Student portal](#8-student-portal)
9. [End-to-end election flow](#9-end-to-end-election-flow)
10. [Live auto-sync](#10-live-auto-sync)
11. [Security](#11-security)
12. [Troubleshooting](#12-troubleshooting)
13. [Further docs](#13-further-docs)

---

## 1. What this system is

A three-part voting system for student government elections:

| App | Who uses it | Role |
|-----|-------------|------|
| **Admin console** | Election officers / admins | Create elections, manage students & candidates, open/close voting, view live results & audit logs |
| **Student portal** | Students | Sign in with student ID, browse candidates, cast one ballot, see receipt & live standings |
| **Backend** | Shared API | Auth, business rules, MongoDB storage, vote integrity |

Both front ends are the **same React app** on the same origin — `/dashboard…` for admins, `/student-login` and `/student/*` for students. There is no separate mobile app to install.

Students do **not** self-register. Admins add student records first; each student creates a password on first sign-in.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│  One React + Vite site — localhost:5173          │
│  ┌───────────────────┐  ┌────────────────────┐   │
│  │ Admin console     │  │ Student portal     │   │
│  │ /dashboard …      │  │ /student-login,    │   │
│  │                   │  │ /student/*         │   │
│  └─────────┬─────────┘  └─────────┬──────────┘   │
└────────────┼──────────────────────┼──────────────┘
             │  Bearer JWT (admin)  │  Bearer JWT (student)
             └──────────┬───────────┘
                          ▼
                 ┌─────────────────┐
                 │  Backend API    │
                 │  Express :5000  │
                 └────────┬────────┘
                          ▼
                 ┌─────────────────┐
                 │  MongoDB        │
                 │  ssg_election   │
                 └─────────────────┘
```

**Data model (simplified):**

- **Admin** — manages the system  
- **Student** — can vote once (`has_voted`)  
- **Election** — `draft` → `ongoing` → `closed`  
- **Position** — races inside an election (e.g. President)  
- **Candidate** — belongs to a position (+ optional photo / partylist)  
- **Vote** — one choice per student per position  
- **AuditLog** — append-only admin actions  

---

## 3. Repository layout

```
voting system/
├── backend/                 # Node.js + Express + MongoDB API
├── admin-web/               # React site — admin console + student portal
│   └── src/student/         # Student portal (routes, pages, styles)
├── docs/                    # Extra documentation
│   ├── security-and-admin-registration.md
│   └── progress/            # Day-by-day build notes
└── README.md                # This file
```

---

## 4. Prerequisites

- **Node.js** 18+ (backend + admin-web)
- **MongoDB** running locally (or a remote URI)
- A modern browser — that is the whole student client

---

## 5. Quick start

### 5.1 Backend

```bash
cd backend
cp .env.example .env
# Edit .env if needed (MONGO_URI, JWT_SECRET, ALLOWED_ORIGINS)
npm install
npm run dev
# → http://localhost:5000
# Health: GET http://localhost:5000/api/health
```

### 5.2 Admin web

```bash
cd admin-web
cp .env.example .env
# VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
# → http://localhost:5173 (or 5174 if 5173 is busy)
```

Create an admin at **`/register`**, or sign in at **`/admin-login`**.

### 5.3 Student portal

Same dev server, no second command. Open **`/student-login`** and sign in with a
student ID an admin has already added.

Keep the backend running whenever you use the site.

---

## 6. Backend API

### Stack

Express 5 · MongoDB/Mongoose · JWT · bcrypt · Helmet · CORS · rate limits · multer (photos)

### Config (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `PORT` | Default `5000` |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Token signing secret (use a long random value in production) |
| `JWT_EXPIRES_IN` | e.g. `4h` |
| `ALLOWED_ORIGINS` | Comma-separated admin origins (e.g. `http://localhost:5173,http://localhost:5174`) |
| `ALLOW_ADMIN_REGISTER` | `true` to allow `/register`; set `false` in production |

### Auth roles

| Role | Middleware | Used by |
|------|------------|---------|
| `admin` | `adminOnly` | Admin web |
| `student` | `studentOnly` | Student portal |

A student JWT **cannot** call admin routes (returns `403 Admin access required`).

### Main route groups

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Admin register/login/change-password; student lookup/login/set-password |
| `/api/elections` | Election CRUD, open, close |
| `/api/elections/:id/positions` | Positions |
| `/api/elections/:id/candidates` | Candidates + photo upload |
| `/api/elections/:id/results` | Tallies + section monitoring |
| `/api/students` | Student CRUD, password reset, CSV/Excel import |
| `/api/votes` | Cast ballot; vote status |
| `/api/mobile` | Active election, ballot, candidates, live results, vote receipt |
| `/api/dashboard` | Admin dashboard stats |
| `/api/audit-logs` | Append-only audit list |
| `/api/health` | Health check |
| `/uploads` | Static candidate photos |

### Election statuses

| Status | Meaning |
|--------|---------|
| `draft` | Setup only; students cannot vote |
| `ongoing` | Open for voting (also must be inside start/end dates) |
| `closed` | Voting stopped |

### Vote rules (server-enforced)

1. Election is `ongoing` and within the date window  
2. Student has not voted yet (atomic `has_voted` update)  
3. Unique vote per student per position  
4. Candidate must belong to the claimed position/election  
5. Admins see **aggregate** tallies only — not who voted for whom  

---

## 7. Admin web

### Stack

React 19 · Vite · React Router · Tailwind CSS 4 · Axios · Recharts · Lucide · react-hot-toast

### Pages

| Path | Feature |
|------|---------|
| `/login` | Admin sign-in |
| `/register` | Create admin account |
| `/dashboard` | Overview + live top runners |
| `/elections` | List/create/edit; open/close; manage positions |
| `/elections/:id` | Election detail + live results bars |
| `/candidates` | Candidates by election/position (photos) |
| `/students` | Students by section; import; reset password |
| `/results` | Charts + section turnout monitoring |
| `/audit-logs` | Who did what, when |

### Notable UX / security

- **30-minute idle logout**
- **Password re-auth** before close/delete election and delete candidate
- **Change password** from the sidebar (key icon)
- Sticky sidebar navigation
- Confirm dialogs for destructive actions

### API client

- Base URL: `VITE_API_URL` (default `http://localhost:5000/api`)
- Token: `localStorage` → `admin_token`
- File: `admin-web/src/api/axios.js`

---

## 8. Student portal

### Stack

React 19 · React Router · axios · lucide-react · a scoped stylesheet (`src/student/styles/student.css`)

### Screens / routes

| Path | Screen |
|------|--------|
| `/student-login` | Enter student ID → lookup → sign in, or create a password |
| `/student/home` | Active election + **live standings** |
| `/student/candidates` | Browse by partylist, or search |
| `/student/candidates/:id` | Candidate detail (platform, biodata) |
| `/student/vote` | Ballot wizard — one position per step; abstain allowed |
| `/student/confirmation` | Submission success |
| `/student/profile` | Account + voting status + logout |

Navigation: bottom tab bar on phones, inline top nav from 860px up —
**Home · Candidates · Vote · Profile**. Once a student has voted, `/student/vote`
becomes their receipt: the ballot they cast plus the live tally with their own
picks marked.

### Auth flow (ID-first)

1. Student enters **student ID** (must already exist in the admin student list).
2. The site calls `POST /api/auth/student/lookup`.
3. If no password yet → **Create password**.
4. If a password exists → **Sign in**.
5. JWT is kept in `localStorage` under `student_token`, separate from the admin
   session, and a 401 sends the student back to `/student-login`.

Admin can **reset password** from the Students page so the student can create a new one.

### API config

`admin-web/src/student/api/client.js` reads `VITE_API_URL` (default
`http://localhost:5000/api`) and derives the photo origin by stripping `/api`,
so candidate photos resolve to `http://localhost:5000/uploads/…`.

---

## 9. End-to-end election flow

```
Admin                          Backend                         Student
─────                          ───────                         ───────
Register / login
Add students (or import Excel)
Create election (draft)
Add positions
Add candidates (+ photos)
Open election ─────────────► status = ongoing
                                                   Lookup ID → set password / login
                                                   Browse candidates
                                                   Cast vote ──► validate + save votes
View live results ◄────────── tallies ◄────────── Home live standings
Close election ────────────► status = closed
                                                   Further votes rejected
```

**Recommended demo order**

1. Start MongoDB + backend + admin-web.  
2. Register admin → import/add students.  
3. Create election, positions, candidates → **Open**.  
4. Run mobile → student login → vote → see receipt & home standings.  
5. Watch admin Dashboard / Election detail update live.  
6. **Close** election (password confirm).

---

## 10. Live auto-sync

Both clients refresh results without a full page reload:

| Client | Interval | Behavior |
|--------|----------|----------|
| Admin web | ~8s (audit logs ~12s) | `useAutoSync` — pauses when the browser tab is hidden |
| Student portal | ~8s | Poll while the tab is visible, plus a sync on tab focus |

Admin also shows live badges on dashboard / election detail / results.

---

## 11. Security

High-level controls already in the codebase:

- bcrypt passwords; short-lived JWTs; role separation  
- Rate limits on auth and voting  
- CORS allowlist; Helmet headers; NoSQL sanitize (Express 5–safe)  
- Admin password complexity; idle timeout; re-auth for sensitive actions  
- Mobile JWT in secure storage  
- Ballot secrecy for admins (aggregates only)

**Detailed write-up:** [`docs/security-and-admin-registration.md`](docs/security-and-admin-registration.md)  

**Production tips**

- Set a strong `JWT_SECRET`  
- Set `ALLOW_ADMIN_REGISTER=false` after creating admins  
- Enable HTTPS on your host  
- Prefer authenticated MongoDB  

---

## 12. Troubleshooting

| Problem | Fix |
|---------|-----|
| Admin: “Registration failed” / network error | CORS — add your Vite origin (e.g. `5174`) to `ALLOWED_ORIGINS` and restart backend |
| Mobile cannot reach API | Emulator uses `10.0.2.2`; device needs LAN IP + `--dart-define=API_BASE_URL=...` |
| “Student ID not found” | Add the student in admin **Students** first |
| Cannot vote | Election must be **ongoing** and within start/end dates; student must not have voted |
| Photos broken | Check `/uploads` is served; API origin (without `/api`) must match |
| Port 5000 in use | Stop the old Node process or change `PORT` in `.env` |

---

## 13. Further docs

| Document | Contents |
|----------|----------|
| [`docs/security-and-admin-registration.md`](docs/security-and-admin-registration.md) | Security hardening + admin registration API/UI |
| [`docs/progress/day1-foundation.md`](docs/progress/day1-foundation.md) | Early backend notes |
| [`docs/progress/day2-admin-web.md`](docs/progress/day2-admin-web.md) | Admin web build notes |
| [`docs/progress/day3-vote-api.md`](docs/progress/day3-vote-api.md) | Vote API notes |
| [`docs/progress/day4-mobile-app.md`](docs/progress/day4-mobile-app.md) | Mobile build notes |

---

## License / academic use

Built as an SSG election management and voting system for school use and academic demonstration. Treat student records as personal data under the Philippines Data Privacy Act of 2012 when using real information.
