# Cutover — August 24–26, 2026

Work record for the three days that took the SSG voting system from a laptop to
Render and Vercel. Covers the frontend rebuild, a data leak that was scrubbed
from git history, and the deployment itself.

For the ongoing self-hosted Ubuntu path, see [DEPLOYMENT.md](DEPLOYMENT.md) —
that route was planned but not taken.

---

## Timeline

August 24 has no commits of its own; that day's work shipped inside the
August 25 and 26 commits. Struck-through hashes were replaced by the history
rewrite.

| When | Commit | What |
|---|---|---|
| Aug 24 | — | Fixed the zero-length election window (`electionWindow.js`) |
| Aug 24 | — | Started `cyberpunk.css`, the landing page layer |
| Aug 25 14:28 | `9bd5ed5` | Standings after close, landing page, audience targeting |
| Aug 25 14:40 | `401736e` | Skipped the Flutter student-web build on CI |
| Aug 26 01:40 | ~~`0153b30`~~ → `ceb45a0` | Full React student portal — and the leak |
| Aug 26 01:44 | ~~`47e4c17`~~ → `03cefb9` | Emptied `.env.example` on GitHub |
| Aug 26 01:57 | `5f0abbb` | History scrubbed, env template restored |
| Aug 26 02:36 | `96a1012` | Render blueprint, uploads dir created at boot |
| Aug 26 02:54 | `f853ef4` | Frontend pointed at the Render API |

### The zero-length election window

The admin form uses `<input type="date">`, which submits a bare `YYYY-MM-DD`.
Passed straight to Mongoose that becomes midnight UTC, so a one-day election
ended the same instant it started — a window nobody could vote in.
`backend/src/utils/electionWindow.js` now widens date-only values: the start
opens at `00:00:00.000`, the end closes at `23:59:59.999`. Values that already
carry a time are left alone.

---

## The frontend rebuild

Students used to need a separate Flutter app, compiled into
`admin-web/public/student/` by a build script and served alongside the site.
That path is gone. The student portal is now React routes inside the same app —
nothing to install, nothing separate to host, one deploy for everything.
`StudentPortal.jsx` and `build-student-web.mjs` were both deleted.

### Three scoped design layers

One React app paints three visually distinct worlds. Each is namespaced so the
layers cannot bleed into each other.

| Scope | Where | Treatment | Size |
|---|---|---|---|
| `.cp` | Public landing page | Cyberpunk / synthwave, near-black `#06010f` | `cyberpunk.css`, 559 lines |
| `.sp` | Student portal | Desktop-first sidebar + content, blue `#2333b4` with red `#ff4b3a` on light canvas | `student.css`, 2,199 lines |
| (default) | Admin console | Tailwind on a dark body | `landing.css`, 505 lines |

`cyberpunk.css` sits inside Tailwind's `components` layer so plain utilities
(`hidden`, `text-*`, `p-*`) still win over its class defaults. The student
portal is scoped under `.sp` precisely because the admin console paints a dark
body — the two grounds are opposites.

Typography is three Google families loaded once in `index.html`: Plus Jakarta
Sans carries the student portal, with Manrope and Inter available to the other
layers.

### Student portal routes

| Route | Page | Purpose |
|---|---|---|
| `/student-login` | Login | Student ID lookup, then password or first-time password creation |
| `/student/home` | Home | Active election, voting window, whether they have voted |
| `/student/candidates` | Candidates | Roster, plus candidate detail and team roster views |
| `/student/vote` | Vote | The ballot, then confirmation and a vote receipt |
| `/student/standings` | Campus standings | Tallies across every year level |
| `/student/profile` | Profile | Section, level, account |

Election state is keyed on the session in `src/student/routes.jsx`. Signing out
drops every cached ballot and tally rather than leaking them to the next student
on the same device — which matters when students share a lab computer.

### Admin console changes

- **Level and section targeting** — `LevelAudiencePicker` (167 lines) chooses
  which year levels and sections an election is open to. Enforced server-side in
  `backend/src/utils/audience.js`.
- **Section-based positions** — positions matching `/represent/i`, or flagged
  explicitly, are scoped to the student's own section.
- **Standings after close** — final results stay visible once an election ends.
- **Public landing page** — 644 lines, with ACLC branding, voting rules, team.

---

## The leak

Caught minutes after pushing to a public repository.

**No secrets leaked.** `backend/.env` is gitignored and was never committed.
Every `.env.example` held placeholders only. No hardcoded credentials anywhere.
**Nothing needs rotating.**

What was actually exposed, all in commit `0153b30`:

| Files | Count | What |
|---|---|---|
| `…-ticket.pdf` | 2 | Personal e-ticket |
| `…Software_Development_Agreement…docx` | 1 | Client contract |
| `SRG.png`, `auth_hero.png`, others | 7 | Story Race Game assets |
| `MSJAN.jpg`, `SIRPAT.jpg`, others | 4 | Duplicate team photos, logo |

None were referenced by any code — they had been dropped into
`admin-web/src/pages/public/`, a folder Vite does not serve.

### How it was cleaned

`git rm` is not enough: the files stay in the old commit and remain
downloadable. A history rewrite was required.

```bash
# backed up first — the files stay on disk, just untracked
git tag backup-before-scrub 47e4c17

git filter-branch --index-filter \
  "git rm --cached --ignore-unmatch --pathspec-from-file=<paths>" \
  --prune-empty -- 401736e..HEAD

git push --force-with-lease origin main
```

Verified against `raw.githubusercontent.com` — all 14 files return `404` on
`main`.

**Still outstanding:** the old commit `0153b30` remains reachable on GitHub by
full SHA; GitHub does not immediately garbage-collect unreachable objects. A
purge request has to be filed by the account owner at
<https://support.github.com/contact>. Risk context: 0 forks, 0 stars, roughly
15 minutes of exposure.

### Guardrails added

`.gitignore` now blocks `*.pdf`, `*.docx`, `*.xlsx`, `*.pptx`, and the specific
SRG assets. Deliberately broad — use `git add -f` for a legitimate document.

---

## The cutover

### Render — backend

| Setting | Value |
|---|---|
| URL | `https://voting-system-aclc.onrender.com` |
| Service ID | `srv-da6tudoae00c7384c5tg` |
| **Root Directory** | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Plan | Free (spins down after 15 min) |

`render.yaml` at the repo root holds all of this as a Blueprint. Note that it
does **not** apply to the existing dashboard-created service — that service
reads its settings from the dashboard only.

**The bug that ate two deploys.** Two builds failed with `status 127`:

```
==> Running build command '=npm install'...
bash: line 1: =npm: command not found
```

A stray `=` at the front of the Build Command field. Bash tried to run a program
called `=npm`. One character, two failed deploys.

### Environment variables

| Key | Value | Why it matters |
|---|---|---|
| `NODE_ENV` | `production` | Without it, CORS accepts any private-LAN origin |
| `MONGO_URI` | Atlas SRV string | Server calls `process.exit(1)` if wrong |
| `JWT_SECRET` | 64 hex chars | Signs every session token |
| `JWT_EXPIRES_IN` | `4h` | — |
| `ALLOWED_ORIGINS` | `https://voting-system-aclc.vercel.app` | **No trailing slash** — exact string match |
| `ALLOW_ADMIN_REGISTER` | `true` | Open while admins self-register |
| `NODE_VERSION` | `22.19.0` | Otherwise Node 24, risking the `bcrypt` native build |

Do **not** set `PORT` — Render injects it.

`ATLAS_URI`, `ATLAS_DB`, `LOCAL_URI`, `LOCAL_DB` are only for the one-time
`backend/scripts/migrate-to-atlas.js` script and are not needed in production.

### Vercel — frontend

The deployed site gets its API URL from `admin-web/.env.production`, not from a
dashboard variable. Vite reads that file only for production builds, so
`npm run dev` still uses `localhost:5000` and local work never touches the live
database. It is safe to commit — a public URL, and every `VITE_*` value is baked
into the bundle where the browser can read it anyway.

The two URLs point at each other: Vercel needs `VITE_API_URL`, and Render needs
`ALLOWED_ORIGINS`. With only one side wired, the browser shows "Network Error".

---

## Verification

Every row is a real request sent to the live system.

| Test | Result | What it proves |
|---|---|---|
| `GET /api/health` | `200 {"status":"ok"}` | Running, connected to Atlas |
| CORS from a LAN origin | rejected | `NODE_ENV=production` is set |
| `GET /api/elections` no token | `401` | Auth works, `JWT_SECRET` valid |
| Preflight on `/auth/admin/login` | `204` | CORS headers complete |
| `POST /auth/admin/login` bad password | `401` | Reached the DB, returned with CORS |
| `POST /auth/student/lookup` | `200` | Correct student record returned |
| Vercel bundle | matches local build | Render URL baked in, no `localhost` |

`401` rather than `500` is the strongest signal: the request reached application
code, queried Atlas, and came back with the right CORS headers.

---

## Data lost

While testing whether the uploads directory really gets created at boot,
`rm -rf uploads` was run inside `backend/`. That deleted **5 candidate photos**.
`rm` in Git Bash does not use the Recycle Bin, and `uploads/` is gitignored, so
there was no copy anywhere. The `photo_url` values remain in the database and
now render as broken images.

The same loss would have happened on Render at the first redeploy anyway — see
the first open item below.

---

## Still open

1. **Photos vanish on every deploy** *(critical)* — multer writes to disk and
   Render's filesystem is ephemeral. The `mkdirSync` fix in `server.js` solves
   the `ENOENT` crash, not persistence. Options: Cloudinary (free tier, ~30
   lines), Render Persistent Disk (paid), or base64 in Mongo.
2. **"Network Error" on student login** *(unresolved)* — the request works from
   the server side. Suspect a stale browser bundle still pointing at
   `localhost:5000`, blocked as mixed content. Check DevTools → Network for the
   actual Request URL and Status.
3. **50-second cold start** — the free instance sleeps after 15 minutes.
   Render Starter is $7/month.
4. **Admin registration is open** — `/api/auth/admin/register` has no auth
   middleware; anyone who POSTs receives a working admin token. Open on purpose
   while admins register. Set `ALLOW_ADMIN_REGISTER=false` afterwards (restart
   only, no redeploy).
5. **GitHub purge request** — must come from the account owner.

---

## Quick reference

| | |
|---|---|
| Student and admin portal | `https://voting-system-aclc.vercel.app` |
| API | `https://voting-system-aclc.onrender.com/api` |
| Health check | `https://voting-system-aclc.onrender.com/api/health` |
| Repo | `github.com/reycadealba07192303-ai/voting-system-aclc` |

**When you change code.** Render and Vercel both deploy automatically from
`main`. If you change only an env var: Render needs a restart, not a redeploy;
Vercel needs a **full rebuild**, because `VITE_*` values are baked in at build
time.

**Local development** is unchanged. `npm run dev` reads `admin-web/.env` and
talks to `localhost:5000`.

**Backups left behind.** All 14 scrubbed files are still in the working tree,
untracked. There is also a local tag `backup-before-scrub` and filter-branch's
`refs/original` — delete both once everything is confirmed correct.
