# Security Hardening & Admin Registration

Documentation for recent security work and the admin registration flow in the Student Election System.

---

## 1. Overview

This project hardens the **backend API**, **admin web**, and **student mobile** apps so votes stay trustworthy, accounts stay protected, and personal data is handled carefully.

Related checklist (status of each item):

- [`student-mobile/security-hardening-checklist.md`](../student-mobile/security-hardening-checklist.md)

---

## 2. Security Hardening

### 2.1 Authentication & passwords

| Control | Implementation |
|--------|----------------|
| Password hashing | **bcrypt** cost factor **12** (Admin + Student models) |
| JWT secret | From `JWT_SECRET` in `.env` (never hardcoded) |
| JWT lifetime | Default **`4h`** via `JWT_EXPIRES_IN` |
| Role checks | `adminOnly` / `studentOnly` middleware — student tokens cannot call admin routes |
| Login errors | Generic **"Invalid credentials"** (no ID/password leak) |
| Rate limiting | Login, votes, and general API limited via `express-rate-limit` |

**Password policies** (`backend/src/utils/passwordPolicy.js`):

- **Student:** at least **8** characters  
- **Admin:** at least **10** characters, plus **uppercase**, **lowercase**, and a **number**

Admins can change their password from the sidebar (key icon) → `PATCH /api/auth/admin/change-password`.

### 2.2 Vote integrity

Server-side rules (not UI-only):

1. Election must be **`ongoing`** and within **start/end** dates (server clock).  
2. **One vote per student** via atomic `findOneAndUpdate({ has_voted: false })`.  
3. Unique MongoDB index on `(election_id, student_id, position_id)`.  
4. Each `candidate_id` must belong to the given `position_id` and election.  
5. Timestamps are set on the server — client timestamps are ignored.  
6. Admin results show **aggregates only**; individual ballot choices are not exposed on admin endpoints.

### 2.3 API & HTTP security

| Control | Notes |
|--------|--------|
| Helmet | Standard security headers |
| CORS | Allowlist in `ALLOWED_ORIGINS` (e.g. `http://localhost:5173,http://localhost:5174`) |
| Input validation | `express-validator` on auth routes; vote body shape-checked |
| NoSQL sanitize | Express 5–safe sanitize of body/params/query + `mongoose.set('sanitizeFilter', true)` |
| Uploads | Candidate photos: **jpg / png / webp** only, size-limited, under `/uploads` |
| Errors | Generic 500 messages to clients; details logged server-side |
| Debug routes | Only `/api/health` remains public |

### 2.4 Admin panel protections

- **Idle timeout:** auto-logout after **30 minutes** of inactivity.  
- **Password re-auth** required before:
  - Closing an election  
  - Deleting an election  
  - Deleting a candidate  
- **Audit logs:** append-only (list only; no edit/delete in UI). Actions such as register, open/close election, delete candidate are recorded.

### 2.5 Student mobile protections

- JWT stored in **`flutter_secure_storage`** (migrates off legacy `SharedPreferences`).  
- API base URL overridable with:

  ```bash
  flutter run --dart-define=API_BASE_URL=https://your-api.example.com/api
  ```

- Student set-password UI enforces the **8-character** minimum to match the backend.

### 2.6 Environment variables (backend)

See `backend/.env.example`. Important keys:

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing key (32+ random chars in production) |
| `JWT_EXPIRES_IN` | e.g. `4h` |
| `ALLOWED_ORIGINS` | Comma-separated admin-web origins |
| `ALLOW_ADMIN_REGISTER` | `true` / `false` — open admin signup |

`.env` is gitignored; do not commit secrets.

### 2.7 Ops items (not fully automated in code)

These remain deployment / process responsibilities:

- HTTPS on the public host  
- MongoDB authentication, least-privilege DB user, no public bind  
- Regular DB backups during live voting  
- Optional certificate pinning on mobile  
- Data Privacy Act awareness (minimize/real-data cleanup after defense)

### 2.8 Manual checks before defense

Still recommended by hand:

1. Two students vote at the same time → no double vote.  
2. Student JWT against an admin route → rejected (`Admin access required`).  
3. Vote on draft / closed / out-of-window election → blocked.

---

## 3. Admin registration

### 3.1 Purpose

Admins can create their own account from the web UI (useful for first setup and demos) without seeding via MongoDB manually.

### 3.2 How to use (UI)

1. Start backend (`backend`) and admin-web (`admin-web`).  
2. Open **`/register`** (or click **Create one** on the login page).  
3. Fill in:
   - Full name  
   - Email  
   - Password / confirm (must meet admin policy)  
4. On success, the user is **logged in** and sent to the dashboard.

Login ↔ Register links are available on both pages.

### 3.3 API

**`POST /api/auth/admin/register`**

Request body:

```json
{
  "name": "Reyca De Alba",
  "email": "admin@school.edu",
  "password": "YourStrong1"
}
```

Success (`201`):

```json
{
  "token": "<jwt>",
  "admin": {
    "_id": "...",
    "name": "Reyca De Alba",
    "email": "admin@school.edu",
    "role": "admin"
  }
}
```

Common errors:

| Status | Meaning |
|--------|---------|
| `400` | Validation or password policy failed |
| `403` | Registration disabled (`ALLOW_ADMIN_REGISTER=false`) |
| `409` | Email already registered |
| `500` | Unexpected server error |

Registration is audited as `register_admin`.

### 3.4 Related endpoints

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/auth/admin/login` | Email + password → JWT |
| `PATCH` | `/api/auth/admin/change-password` | Requires current password; new password must pass policy |

### 3.5 Key files

| Area | Path |
|------|------|
| Register API | `backend/src/routes/auth.routes.js` |
| Validators | `backend/src/middleware/authValidators.js` |
| Password policy | `backend/src/utils/passwordPolicy.js` |
| Register page | `admin-web/src/pages/Register.jsx` |
| Login link | `admin-web/src/pages/Login.jsx` |
| Auth context | `admin-web/src/context/AuthContext.jsx` |
| API client | `admin-web/src/api/auth.js` |
| Route | `admin-web/src/App.jsx` → `/register` |

### 3.6 Production tip

For a live deployment, set:

```env
ALLOW_ADMIN_REGISTER=false
```

so random visitors cannot create new admin accounts. Create the first admin while registration is still enabled, or insert one securely offline, then lock registration.

### 3.7 CORS note

If the Vite app runs on a port other than those listed (e.g. `5175`), add it to `ALLOWED_ORIGINS` and restart the backend. A CORS block often shows up in the UI as a generic registration/network failure even when the password is valid.

---

## 4. Quick verify

```bash
# Backend health
curl http://localhost:5000/api/health

# Register (example)
curl -X POST http://localhost:5000/api/auth/admin/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Demo Admin\",\"email\":\"demo@school.edu\",\"password\":\"AdminPass12\"}"
```

Then open admin-web → sign in (or use `/register`) and confirm dashboard access.

---

## 5. Summary

- Security hardening covers auth, votes, API headers/CORS/sanitize, admin idle timeout + re-auth, and secure mobile token storage.  
- Admin registration provides a first-class **Create admin** flow on the web, backed by a validated API and password policy, with an env switch to disable it in production.
