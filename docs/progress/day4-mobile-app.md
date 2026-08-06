# Day 4 — Mobile Student App ✅ COMPLETED (Core Screens)

**Date:** August 5, 2026

## What Was Built

### Flutter App (Android)
- Package: `com.ssg.election.student_mobile`
- Running on Android Emulator (API 36) via `emulator-5554`
- Backend URL: `http://10.0.2.2:5000/api` (emulator → localhost)
- Light theme throughout (white background, indigo/blue accent)

### Architecture
- **State management:** Provider (`AuthService`, `ElectionService`)
- **Navigation:** go_router with `createAppRouter(authService)`
- **Theme:** Custom `AppColors` (Philippine civic palette — blue, white, red)
- **Font:** Plus Jakarta Sans (Google Fonts)

### Screens Completed

#### Login (2-step flow)
1. Enter Student ID → calls `lookupStudent()` to check if password is set
2a. No password yet → redirect to **Set Password** screen
2b. Has password → show password field → sign in
- Smooth hero image + gradient header

#### Set Password (First Login)
- Shown only on first login (password not yet bcrypt-hashed)
- Confirms new password, calls `POST /api/auth/student/set-password`
- Redirects to Home on success

#### Home
- Greeting with time of day (Good morning/afternoon/evening)
- Active election hero card with turnout bar + "Cast your vote" CTA
- Quick access cards: Candidates, Vote Now, My Profile

#### Candidates (3-level drill-down)
- **Level 1:** Positions grid (card per position)
- **Level 2:** Teams/Partylist list for selected position
- **Level 3:** Candidate list with photo, name, position, platform preview
- **Detail:** Photo hero, position pill, name, partylist, platform (no biodata)
- Back navigation between levels

#### Voting
- Per-position candidate selector with animated radio circles
- Progress bar showing X of N positions selected
- Review sheet (bottom sheet) before final submit
- Warning card: "Vote is final"
- Submit → confirmation screen

#### Confirmation
- Animated success circle (elastic bounce)
- Receipt card: Status, Date, Election name
- "Back to Home" and "View My Vote" buttons

#### Profile
- Gradient header with student avatar (initials)
- Student ID, section, name
- Vote status card (voted / not voted)
- "My Votes" detail list (shows which candidate per position)
- Logout with confirmation dialog

### Bottom Navigation (4 tabs)
Home · Candidates · Vote · Profile
*(Students tab removed — not needed for student-facing app)*

### Key Technical Fixes Applied
- `addPostFrameCallback` in all `initState` calls (prevents setState-during-build)
- `Future.microtask(notifyListeners)` in ElectionService (avoids build-phase notify)
- `GoRouter.of(context)` captured before async gaps (avoids BuildContext misuse)
- All `withOpacity()` calls replaced with `withValues(alpha:)` (Flutter 3.41 deprecation)
- INTERNET permission + `android:usesCleartextTraffic="true"` in AndroidManifest

## Status
✅ App runs on Android emulator with no errors.
✅ Login, voting flow, and profile all functional end-to-end.

## What's Still Needed (Remaining Days)
- [ ] Day 5: Results display + Dashboard live stats + PDF/Excel export
- [ ] Day 6: Load testing, bug fixing, demo prep
- [ ] Polish: PDF export of results, Excel export of voter list
- [ ] Polish: Candidate photo display in voting screen (currently placeholder)
- [ ] Polish: Push notifications or countdown timer for election end
