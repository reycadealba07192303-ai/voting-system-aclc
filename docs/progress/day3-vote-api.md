# Day 3 — Vote API ✅ COMPLETED

**Date:** August 5, 2026

## What Was Built

### Vote Submission Endpoint
`POST /api/votes`
- Accepts: `{ election_id, votes: [{ position_id, candidate_id }] }`
- Enforces **server-side only** (no DB-level constraints):
  1. Election must be `ongoing`
  2. Student must not have already voted in this election
  3. All vote entries must include position_id and candidate_id
- Inserts all votes atomically via `Vote.insertMany()`
- Marks student `has_voted: true` after successful submission

### Vote Status Endpoint
`GET /api/votes/status/:electionId`
- Returns `{ has_voted: true/false }` for the authenticated student

### Mobile-Facing Read Routes (`/api/mobile/...`)
- `GET /mobile/election/active` — active (ongoing) election
- `GET /mobile/election/:id/ballot` — positions + candidates nested (for voting screen)
- `GET /mobile/election/:id/candidates` — flat candidate list for directory
- `GET /mobile/vote-status/:id` — student's submitted votes (populates candidate/position names)
- `GET /mobile/sections` — distinct sections list
- `GET /mobile/sections/:section/students` — students in a specific section

### Results Computation (`/api/elections/:id/results`)
- Vote count per candidate per position
- Winners determined by `max_winners` per position
- Turnout calculated from unique voters

### Per-Section Monitoring (`/api/elections/:id/monitoring`)
- Groups students by section
- Computes voted / not-voted / turnout % per section

## Security Notes
- One vote per student per position enforced in controller logic
- No unique index on `votes` collection by design (MongoDB limitation)
- Election status checked before every vote submission
- Student token cannot access admin endpoints (role check middleware)

## Status
✅ Vote logic complete and tested via Postman.
✅ Results and monitoring endpoints working.
