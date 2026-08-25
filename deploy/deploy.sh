#!/usr/bin/env bash
# Build and release the whole system on the Ubuntu server — backend and both
# frontends. Nothing is built on a developer machine.
#
#   sudo -u voting /opt/voting/app/deploy/deploy.sh
#
# Safe to re-run. .env and uploads/ are gitignored, so `git pull` never
# touches them and the built dist/ is replaced in place.
set -euo pipefail

APP="${APP:-/opt/voting/app}"

step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }

# ── Where the site will be served from ───────────────────────────────────────
# The bundle bakes the API URL in at build time. Rather than keep it in a
# second place, read the first entry of ALLOWED_ORIGINS — the backend already
# has to know the public origin, so that is the single source of truth.
ENV_FILE="$APP/backend/.env"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE — see docs/DEPLOYMENT.md step 4" >&2; exit 1; }

PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-$(grep -E '^ALLOWED_ORIGINS=' "$ENV_FILE" | head -n1 | cut -d= -f2- | cut -d, -f1 | tr -d '"'"'"' ')}"
[ -n "$PUBLIC_ORIGIN" ] || { echo "ALLOWED_ORIGINS is empty in $ENV_FILE" >&2; exit 1; }

export VITE_API_URL="$PUBLIC_ORIGIN/api"
echo "Building against $VITE_API_URL"

# ── Source ───────────────────────────────────────────────────────────────────
step "Pulling latest source"
cd "$APP"
git pull --ff-only

# ── Backend ──────────────────────────────────────────────────────────────────
step "Backend dependencies"
cd "$APP/backend"
npm ci --omit=dev

# multer writes straight into these; it does not create them itself, so a
# missing directory only shows up as a 500 on the first photo upload.
mkdir -p uploads/candidates

# ── Frontend ─────────────────────────────────────────────────────────────────
# One Vite bundle now carries both the admin console and the student portal
# (/student-login, /student/*). There is no second app to build.
step "Frontend build (Vite — admin console + student portal)"
cd "$APP/admin-web"
npm ci
npm run build

if [ ! -f "$APP/admin-web/dist/index.html" ]; then
  echo "dist/index.html missing — the Vite build did not land." >&2
  exit 1
fi

# ── Restart ──────────────────────────────────────────────────────────────────
step "Restarting API"
sudo systemctl restart voting-api
sleep 2
curl -fsS localhost:5000/api/health && echo

step "Deployed — $PUBLIC_ORIGIN"
