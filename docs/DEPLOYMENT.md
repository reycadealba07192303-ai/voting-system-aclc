# Deployment — self-hosted Ubuntu

Production runbook for the SSG Voting System on a self-hosted Ubuntu Server
(bare metal, or a VM inside Proxmox). Everything below runs **inside Ubuntu** —
Proxmox only hosts the VM and takes snapshots.

Nothing is bought and nothing is built on a developer machine. The server
clones the repo, builds both frontends and the backend itself, and serves them.
The supporting files are in [`deploy/`](../deploy).

Replace `ssgvote.duckdns.org` with your own hostname throughout.

---

## 0. What gets deployed

One origin, one certificate, no CORS:

| URL | Served by |
| --- | --- |
| `https://ssgvote.duckdns.org/` | React SPA — admin console and student portal, `admin-web/dist/`, static via nginx |
| `https://ssgvote.duckdns.org/student-login` | Student sign-in, served from the same bundle |
| `https://ssgvote.duckdns.org/api/*` | Node/Express on `127.0.0.1:5000` |
| `https://ssgvote.duckdns.org/uploads/*` | Candidate photos, served by the same Node process |

The student portal is not a separate app. It is React, lives in
`admin-web/src/student/`, and is routed at `/student-login` and `/student/*`
inside the same SPA, so `vite build` produces one `dist/` for the whole system.

Everything lives in one git clone:

```
/opt/voting/
├── app/                          ← git clone, built in place
│   ├── backend/
│   │   ├── .env                  ← created once, gitignored, never pulled over
│   │   └── uploads/candidates/   ← candidate photos, gitignored, persists
│   └── admin-web/
│       └── dist/                 ← nginx root; built here by deploy.sh
```

---

## 1. Before you start

- [ ] SSH access to the Ubuntu VM
- [ ] Ubuntu version — `lsb_release -a`. Written against **24.04 LTS**; runs
      unchanged on **26.04 LTS**, since the database is Atlas and no MongoDB
      server package is installed here
- [ ] The Atlas connection string, and access to the Atlas dashboard —
      [step 4](#4-database--mongodb-atlas)
- [ ] `sudo` rights
- [ ] **At least 2 GB RAM and 20 GB disk.** `vite build` is the heaviest thing
      this server will ever do — see [step 5](#5-build-toolchain)
- [ ] A static LAN IP for the VM — [step 2](#2-server-preparation)

---

## 2. Server preparation

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx ufw gnupg unzip xz-utils zip

# Dedicated service account. Its home is /opt/voting; 755 so nginx (www-data)
# can traverse down to admin-web/dist. Ubuntu creates homes 0750 by default,
# which would make every page 403.
sudo useradd --system --create-home --home-dir /opt/voting --shell /bin/bash voting
sudo chmod 755 /opt/voting

# Firewall — SSH and web in. Outbound is unrestricted by default, which the
# Atlas connection needs.
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Give the VM a static IP

DNS will point a name at this address, so it must not change on reboot. Either
set a DHCP reservation on the router, or pin it in netplan:

```bash
ip -4 addr                       # note the interface name; Proxmox VMs are usually ens18
sudo nano /etc/netplan/50-cloud-init.yaml
```

```yaml
network:
  version: 2
  ethernets:
    ens18:
      dhcp4: no
      addresses: [192.168.1.50/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

```bash
sudo netplan apply
```

> Doing this over SSH will drop your session if the address changes. Use the
> Proxmox console for this step, or pick the address the VM already has.

---

## 3. A free hostname

You do not need to buy a domain. [DuckDNS](https://duckdns.org) hands out free
subdomains and, more importantly, has a DNS API — which is what lets you get a
real browser-trusted certificate without opening a single port.

1. Go to [duckdns.org](https://duckdns.org), sign in with Google or GitHub
2. Type a name — `ssgvote` — and click **add domain**. You now own
   `ssgvote.duckdns.org`
3. Copy the **token** at the top of the page. Save it; it is the password for
   every DNS change
4. In the **current ip** box for your subdomain, put the VM's **LAN** address
   (`192.168.1.50`) and click **update ip**

Yes, a public DNS name pointing at a private address. That is intentional: the
name resolves only usefully inside the school network, so the system is
unreachable from the internet — but the certificate is still issued by Let's
Encrypt and trusted by every phone and laptop, with no security warnings.

<details>
<summary>If DuckDNS refuses the private address</summary>

Leave the A record on whatever public IP it defaults to, and override the name
locally instead — a DNS entry on the school router (or Pi-hole) mapping
`ssgvote.duckdns.org` to `192.168.1.50`. The certificate is unaffected: the
DNS-01 challenge in [step 7](#7-tls-certificate) only reads a TXT record, and
never checks where the A record points.
</details>

**Want students voting from home instead?** Skip to
[Path B](#path-b--public-access-instead) after step 8.

---

## 4. Database — MongoDB Atlas

The database is hosted on Atlas, so **nothing is installed on this server** and
step 4 is configuration only. The backend already handles the one gotcha that
bites Atlas connections: `preferPublicDns()` pins DNS to 8.8.8.8/1.1.1.1 before
connecting, because some routers fail the `mongodb+srv` SRV lookup
([`preferPublicDns.js`](../backend/src/utils/preferPublicDns.js)).

### Read this before going further

Atlas puts your election on the far side of the school's internet connection.
If that link drops mid-election, voting stops — even for students standing in
the computer lab, on the same LAN as the server. A local MongoDB would keep
running through an outage.

Decide deliberately:

| | Atlas | Local MongoDB |
| --- | --- | --- |
| Setup | Already done | ~15 minutes |
| Internet outage on election day | **Voting halts** | Unaffected |
| Backups | Manual on M0 (free tier has no automated backups) | `deploy/backup.sh` nightly |
| Where the votes live | Third-party cloud | Your server |

Atlas is a legitimate choice — just make it a choice, not an accident. If the
school's connection is unreliable, migrating to a local MongoDB before election
day is worth the 15 minutes; ask and it can be added back to this runbook.

### Atlas configuration

1. **Network Access** → add the school's **public** IP (`curl -4 ifconfig.me`
   from the VM). If that address is dynamic, you will have to re-add it when it
   changes — check with the school's ISP whether it is static
2. **Database Access** → a user with `readWrite` on the election database only.
   Not an Atlas admin, and not the account you log in with
3. **Database** → copy the connection string (`mongodb+srv://...`)

> Allowlisting `0.0.0.0/0` makes the whole internet able to reach your cluster,
> leaving only the password between an attacker and the votes. Use the real IP.

### Install the client tools

No server package — only `mongosh` to test the connection and `mongodump` for
the nightly backup in [step 10](#10-backups). Both come from MongoDB's own
repository:

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
  | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

# `noble` regardless of your Ubuntu version — these are small client binaries
# and the 24.04 build runs fine on later releases.
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt update
sudo apt install -y mongodb-mongosh mongodb-database-tools
```

> Deliberately **not** `mongodb-org` — that would install and start a local
> server you do not want competing for memory with the build.

### Verify the connection from the server

```bash
mongosh "mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ssg_election" --eval "db.runCommand({ping:1})"
```

`querySrv ENOTFOUND` means DNS; a hang or timeout means the server's IP is not
allowlisted in Atlas. This must pass before the app will start.

That connection string is what goes into `MONGO_URI` in [step 6](#6-the-application).

---

## 5. Build toolchain

### Swap, if the VM has under 2 GB RAM

`vite build` can be killed by the OOM reaper on a 1 GB box.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # expect v20.x
```

Node is the whole toolchain — there is no second SDK to install.

---

## 6. The application

### Clone

```bash
sudo -u voting git clone <YOUR_REPO_URL> /opt/voting/app
```

### Environment

```bash
sudo -u voting cp /opt/voting/app/deploy/backend.env.example /opt/voting/app/backend/.env
sudo -u voting nano /opt/voting/app/backend/.env
sudo chmod 600 /opt/voting/app/backend/.env

openssl rand -hex 32     # paste as JWT_SECRET
```

Non-negotiable values:

| Key | Value | Why |
| --- | --- | --- |
| `NODE_ENV` | `production` | Outside production the CORS layer also accepts any private-LAN origin ([`app.js:26`](../backend/src/app.js#L26)) |
| `ALLOWED_ORIGINS` | `https://ssgvote.duckdns.org` | Exact origin, no trailing slash. `deploy.sh` also reads this to know what URL to build the frontends against |
| `ALLOW_ADMIN_REGISTER` | `true` for now; `false` after you create your admins | Otherwise anyone reaching `/api/auth/register` can mint an admin |
| `JWT_SECRET` | 64 hex chars from the command above | |
| `MONGO_URI` | the Atlas `mongodb+srv://` string from step 4 | Percent-encode any `@ : / ? # [ ] %` in the password, or the URI will not parse |

### Service

```bash
sudo cp /opt/voting/app/deploy/systemd/voting-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable voting-api
```

Let `voting` restart its own service — and only that — so deploys need no root:

```bash
sudo cp /opt/voting/app/deploy/sudoers.d/voting-deploy /etc/sudoers.d/voting-deploy
sudo chmod 440 /etc/sudoers.d/voting-deploy
sudo visudo -c
```

### Build and start

Git on Windows does not always carry the execute bit across, so set it once:

```bash
sudo chmod +x /opt/voting/app/deploy/deploy.sh /opt/voting/app/deploy/backup.sh
sudo -u voting /opt/voting/app/deploy/deploy.sh
```

This pulls, installs backend dependencies, creates `uploads/candidates`, runs
the Vite build (admin console and student portal together), verifies `dist/`
actually landed, restarts the API, and hits `/api/health`.

```bash
curl -s localhost:5000/api/health     # {"status":"ok"}
```

Logs: `sudo journalctl -u voting-api -f`

---

## 7. TLS certificate

DNS-01 challenge through DuckDNS. No port needs to be open, and it works even
though the A record points at a private address.

```bash
sudo apt install -y socat
curl https://get.acme.sh | sudo sh -s email=you@example.com
```

```bash
sudo -i        # the rest runs as root; acme.sh installed into /root/.acme.sh
```

```bash
~/.acme.sh/acme.sh --set-default-ca --server letsencrypt

export DuckDNS_Token="YOUR_DUCKDNS_TOKEN"
~/.acme.sh/acme.sh --issue --dns dns_duckdns -d ssgvote.duckdns.org --dnssleep 60

mkdir -p /etc/ssl/voting
~/.acme.sh/acme.sh --install-cert -d ssgvote.duckdns.org \
  --key-file       /etc/ssl/voting/privkey.pem \
  --fullchain-file /etc/ssl/voting/fullchain.pem \
  --reloadcmd      "systemctl reload nginx"

exit
```

acme.sh installs its own renewal cron. Certificates renew every 60 days without
you touching anything, and the token stays saved in `/root/.acme.sh/account.conf`.

---

## 8. Nginx

```bash
sudo cp /opt/voting/app/deploy/nginx/voting.conf /etc/nginx/sites-available/voting.conf
sudo sed -i 's/ssgvote.duckdns.org/YOUR_REAL_HOSTNAME/g' /etc/nginx/sites-available/voting.conf
sudo ln -sf /etc/nginx/sites-available/voting.conf /etc/nginx/sites-enabled/voting.conf
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t && sudo systemctl reload nginx
```

### Path B — public access instead

Only if students must vote from off campus. Free, no port forwarding, works
behind CGNAT — but note that Cloudflare Tunnel's free named tunnels require a
domain on a Cloudflare account, so this path is the one place where a purchased
domain is hard to avoid.

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
cloudflared tunnel login
cloudflared tunnel create voting
cloudflared tunnel route dns voting vote.yourdomain.com
```

`/etc/cloudflared/config.yml`:

```yaml
tunnel: voting
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: vote.yourdomain.com
    service: http://127.0.0.1:80
  - service: http_status:404
```

Cloudflare terminates TLS at the edge, so remove the `listen 443` block and the
`return 301` redirect from `voting.conf`, leaving the plain port-80 server for
the tunnel to reach. Then drop `sudo ufw delete allow 'Nginx Full'` — nothing
needs to reach the box from outside any more.

---

## 9. Smoke test

```bash
curl -s https://ssgvote.duckdns.org/api/health          # {"status":"ok"}
curl -sI https://ssgvote.duckdns.org/ | head -1         # 200
curl -sI https://ssgvote.duckdns.org/student/ | head -1 # 200
```

In a browser, on a device connected to the school network:

1. `https://ssgvote.duckdns.org/` loads the admin login, with no certificate warning
2. Register the admin account, then set `ALLOW_ADMIN_REGISTER=false` and
   `sudo systemctl restart voting-api`
3. Create an election, add a position and a candidate **with a photo** — this
   exercises the upload path end to end
4. Confirm the photo renders (it comes back through `/uploads/`)
5. Open `/student/` and cast a test vote
6. Check the results page updates

---

## 10. Backups

The election database and `backend/uploads/` are the only irreplaceable state.
Uploads are on local disk and are not in git.

**On Atlas this is not optional.** The M0 free tier has no automated backups —
a dropped collection or a bad import is unrecoverable without your own dump.
`backup.sh` reads `MONGO_URI` from `.env`, so it dumps the Atlas cluster over
the network using the `mongodump` installed in [step 4](#4-database--mongodb-atlas).

```bash
sudo install -m 750 -o voting -g voting /opt/voting/app/deploy/backup.sh /opt/voting/backup.sh
sudo mkdir -p /var/backups/voting && sudo chown voting:voting /var/backups/voting
sudo touch /var/log/voting-backup.log && sudo chown voting:voting /var/log/voting-backup.log

sudo -u voting crontab -e
```

```cron
15 1 * * * /opt/voting/backup.sh >> /var/log/voting-backup.log 2>&1
```

Run it once by hand to confirm, then **copy the archives off the server** —
a backup on the same disk is not a backup.

```bash
sudo -u voting /opt/voting/backup.sh
```

Restore:

```bash
mongorestore --uri="$MONGO_URI" --archive=/var/backups/voting/db-YYYY-MM-DD_HHMM.archive.gz --gzip --drop
sudo -u voting tar -xzf /var/backups/voting/uploads-YYYY-MM-DD_HHMM.tar.gz -C /opt/voting/app/backend
```

---

## 11. Shipping an update

Push to GitHub from your machine, then on the server:

```bash
sudo -u voting /opt/voting/app/deploy/deploy.sh
```

That is the whole release process. `git pull` never touches `.env` or
`uploads/` — both are gitignored and exist only on the server.

If you changed the hostname, edit `ALLOWED_ORIGINS` in `.env` first; `deploy.sh`
reads it to decide what URL to bake into the frontend bundles.

---

## 12. Election-day checklist

- [ ] Proxmox snapshot of the VM taken **the night before**
- [ ] Backup ran, and a copy is off the server
- [ ] `ALLOW_ADMIN_REGISTER=false`
- [ ] `NODE_ENV=production` — `sudo systemctl show voting-api -p Environment`
- [ ] Certificate is healthy: `sudo ~/.acme.sh/acme.sh --list`
- [ ] Disk has room: `df -h`
- [ ] `sudo systemctl is-enabled voting-api nginx` → both `enabled`, so a
      power blip brings everything back on its own
- [ ] Atlas reachable, and the server's public IP still allowlisted:
      `curl -4 ifconfig.me` then `curl -s localhost:5000/api/health`
- [ ] Someone knows the school's internet is a single point of failure today,
      and who to call if it drops — see [step 4](#4-database--mongodb-atlas)
- [ ] The VM still holds its static IP after a reboot: `sudo reboot`, then recheck
- [ ] UPS on the server, or on the VM host, if campus power is unreliable
- [ ] A test vote cast, then rolled back

---

## 13. Troubleshooting

| Symptom | Cause |
| --- | --- |
| `403 Forbidden` on every page | `/opt/voting` is `0750`; nginx cannot traverse it. `sudo chmod 755 /opt/voting` |
| `502 Bad Gateway` | `voting-api` is down — `sudo journalctl -u voting-api -n 50` |
| API works, admin UI shows network errors | `ALLOWED_ORIGINS` was wrong when `deploy.sh` ran. Fix `.env`, re-run `deploy.sh` |
| `CORS: blocked origin ...` in the journal | `ALLOWED_ORIGINS` does not match the browser's origin exactly (scheme, host, no trailing slash) |
| `/student/home` 404s instead of loading the portal | The SPA fallback is missing — `location / { try_files $uri $uri/ /index.html; }` — or nginx was not reloaded |
| `deploy.sh` fails on "the Vite build did not land" | Run `npm run build` in `admin-web` by hand and read the error; usually a missing dependency after `npm ci` |
| Candidate photo upload 500s | `/opt/voting/app/backend/uploads/candidates` is missing or not owned by `voting` |
| Backend exits at boot with `MongoDB connection failed` | Atlas: the server's public IP is not allowlisted, wrong credentials, or an unencoded special character in the password |
| `querySrv ENOTFOUND` in the journal | SRV lookup failed. `preferPublicDns()` already pins 8.8.8.8/1.1.1.1, so this usually means outbound DNS is blocked on the school network |
| Voting stops working mid-election, API returns 500s | The school's internet dropped and Atlas is unreachable. Nothing on the server can fix this — see the trade-off table in [step 4](#4-database--mongodb-atlas) |
| Everything 404s | `/etc/nginx/sites-enabled/default` is still enabled |
| `deploy.sh` fails at the restart step | `/etc/sudoers.d/voting-deploy` missing, or `systemctl` is not at `/usr/bin/systemctl` |
