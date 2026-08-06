# Security Hardening Checklist — Student Election System

Status legend: `[x]` done in code · `[~]` ops / manual / optional · `[ ]` not done

## 1. Authentication & Authorization
- [x] Passwords hashed with **bcrypt** (never plaintext, never MD5/SHA1) — use cost factor 10-12
- [x] JWT tokens signed with a strong secret (32+ random characters), stored in environment variables, never hardcoded
- [x] JWT expiration set (e.g., 2-4 hours) — force re-login instead of infinite sessions (`JWT_EXPIRES_IN=4h`)
- [x] Every protected route checks **role** (admin token ≠ student token) — a student JWT must be rejected on any `/admin/*` route, even if the token itself is valid
- [x] Rate limit login endpoints (e.g., `express-rate-limit`) — max ~5 attempts per IP per minute, to block brute-force attacks on student IDs
- [x] Generic error messages on failed login ("Invalid credentials") — never reveal whether it's the ID or password that's wrong

## 2. Vote Integrity (the most important part)
- [x] **Server-side enforcement of one-vote-per-student** — check `has_voted` inside the same request that processes the vote, not just a UI-side disabled button
- [x] Use a MongoDB transaction (or at least an atomic `findOneAndUpdate` with the `has_voted: false` filter) when recording a vote, so two simultaneous requests from the same student can't both succeed (race condition) — plus unique index on `(election_id, student_id, position_id)`
- [x] Reject votes if the election status isn't `ongoing`, or if outside the start/end date window — check server time, never trust a timestamp sent from the client
- [x] Validate that submitted candidate IDs actually belong to the position and election being voted on — don't trust the client to only send valid combinations
- [x] Do not expose which candidate a student voted for in any admin-facing endpoint or log — admins should only ever see aggregate tallies and the `has_voted` boolean, never the individual choice tied to a name *(during live voting; after election is **closed**, admins may view a student's ballot read-only via Students → eye icon)*

## 3. API-Level Security
- [x] Input validation on every endpoint (e.g., `express-validator` or `joi`) — reject malformed data before it reaches your database logic *(auth routes validated; vote body shape-checked)*
- [x] Sanitize inputs to prevent NoSQL injection (e.g., don't pass raw `req.body` into Mongoose queries — Mongoose helps, but still validate types so someone can't send `{"$gt": ""}` as a password field) — Express 5–safe sanitize middleware + `mongoose.set('sanitizeFilter', true)`
- [x] CORS configured to only allow requests from your actual admin-web and mobile app origins, not `*`
- [~] HTTPS enforced in production — no plaintext HTTP for login or voting traffic *(enable on host: Render/Railway/etc.)*
- [x] Helmet.js middleware for standard HTTP security headers
- [x] File upload validation for candidate photos — restrict file type (jpg/png/webp) and size, store outside any web-executable path

## 4. Database Security (MongoDB)
- [~] MongoDB instance requires authentication (username/password) — never run with `--noauth` even in dev, so you don't accidentally deploy it open *(see `.env.example` authenticated URI pattern)*
- [~] Database user for the app has only the permissions it needs (read/write on this specific DB, not admin-level access)
- [~] MongoDB not exposed to the public internet — bind to localhost or use a private network/VPC if hosted separately from the API
- [~] Regular backups of the database, especially right before and during the live voting period

## 5. Admin Web App
- [x] Admin passwords held to a higher standard (minimum length/complexity) since this account can create elections and manage all data — `PATCH /auth/admin/change-password` + policy (10+ chars, upper/lower/number)
- [x] Audit logs capture: who did what, when — and audit logs themselves should be append-only (no edit/delete capability from the UI)
- [x] Session timeout on the admin panel — auto-logout after inactivity (30 minutes)
- [x] Consider requiring a fresh login/re-auth before high-impact actions like closing an election or deleting candidates *(password re-auth on close/delete election + delete candidate)*

## 6. Mobile App
- [x] JWT stored securely on-device (Flutter: use `flutter_secure_storage`, not plain `SharedPreferences`, since tokens shouldn't sit in unencrypted storage)
- [x] No sensitive data cached locally beyond what's needed for the session *(profile fields only; token in secure storage; API URL via `--dart-define=API_BASE_URL`)*
- [~] Certificate pinning is optional but worth considering if you have time — prevents man-in-the-middle interception on public school wifi

## 7. Infrastructure & Deployment
- [x] Environment variables (DB connection string, JWT secret) never committed to the repo — use `.env` + `.gitignore`
- [x] Separate configs for development vs. production (don't use dev secrets in the live demo/deployment) — `.env.example` documents production-oriented values
- [~] If deploying publicly (Render/Railway/Vercel), enable their built-in HTTPS and keep dependencies updated (`npm audit` before final submission)

## 8. Data Privacy (Philippines context)
- [~] Since this handles student data, be mindful of the Data Privacy Act of 2012 — even with the minimal fields you're storing (student_id, name, section), treat it as personal data: don't expose it in public-facing endpoints, and delete/anonymize demo data after your defense if it contains real student information *(API requires auth; no public student listing)*

## 9. Before You Submit/Defend
- [ ] Run through the vote flow twice from two different accounts simultaneously to confirm no double-voting is possible *(manual UI test still recommended)*
- [x] Try logging in as a student and manually hitting an admin API endpoint with that token (using Postman) — confirm it's rejected *(verified: `Admin access required`)*
- [x] Check that closed/not-yet-started elections properly block voting attempts *(verified draft election rejected)*
- [x] Remove or disable any test/debug routes before the final demo *(health check only)*
