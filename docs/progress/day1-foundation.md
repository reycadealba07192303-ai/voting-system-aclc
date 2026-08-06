# Day 1 — Foundation ✅ COMPLETED

**Date:** August 4, 2026

## What Was Built

### Backend (Node.js + Express)
- Project scaffolded inside `backend/`
- MongoDB connection via Mongoose (`mongodb://localhost:27017/ssg_election`)
- All 7 Mongoose models created:
  - `Admin` — email + password_hash, bcrypt pre-save hook
  - `Student` — student_id (unique), name, section, password_hash, has_voted
  - `Election` — title, description, start_date, end_date, status (draft/ongoing/closed)
  - `Position` — election_id ref, title, max_winners
  - `Candidate` — election_id, position_id, name, photo_url, partylist, platform
  - `Vote` — election_id, position_id, candidate_id, student_id, timestamp
  - `AuditLog` — user_id, action, description
- Auth routes: `POST /api/auth/admin/login`, `POST /api/auth/student/login`
- First-time login detection (`isFirstLogin` flag returned from student login)
- `POST /api/auth/student/set-password` — first-time password setup
- JWT middleware: `verifyToken`, `adminOnly`, `studentOnly`
- Seed script: `scripts/createAdmin.js`

### Admin Created
- Email: `admin@school.edu`
- Password: `admin123`

## Status
✅ Both admin and student can log in and receive a valid JWT token.
