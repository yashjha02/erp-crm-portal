# Deployment Guide

Two paths are documented:

- **Path A (recommended, free, ~20 min):** Neon (Postgres) + Render (API) + Vercel (frontend)
- **Path B (bonus):** AWS EC2, for the "AWS deployment optional bonus" line in the brief

---

## Path A — Neon + Render + Vercel

### Step 0 — Push the code to GitHub

```bash
cd erp-crm
git init
git add .
git commit -m "Initial commit: ERP+CRM portal (backend, frontend, docs)"
```
Create an empty repo on GitHub (e.g. `erp-crm-portal`), then:
```bash
git branch -M main
git remote add origin https://github.com/<your-username>/erp-crm-portal.git
git push -u origin main
```
`.gitignore` files are already included so `node_modules/`, `.env`, and `dist/`
are never committed.

### Step 1 — Database on Neon (or Supabase / Render Postgres)

1. Go to https://neon.tech → sign up → **New Project**.
2. Copy the connection string shown (starts with `postgresql://...`). Use the
   **pooled** connection string if offered, and append `?sslmode=require` if
   it isn't already present.
3. Keep this tab open — you'll paste it as `DATABASE_URL` in the next step.

### Step 2 — Backend on Render

1. https://render.com → **New +** → **Web Service** → connect your GitHub repo.
2. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && npm start`
3. Add environment variables (Render dashboard → Environment):
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from Step 1 |
   | `JWT_SECRET` | a long random string (e.g. output of `openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `8h` |
   | `CORS_ORIGIN` | your Vercel URL, e.g. `https://erp-crm-portal.vercel.app` (update after Step 3) |
   | `NODE_ENV` | `production` |
4. Deploy. Once live, note the URL, e.g. `https://erp-crm-backend.onrender.com`.
5. Seed demo data once (Render → Shell tab on the service, or run locally
   pointed at the same `DATABASE_URL`):
   ```bash
   npm run seed
   ```
6. Verify: `GET https://erp-crm-backend.onrender.com/health` → `{"status":"ok"}`.

> Free-tier Render web services sleep after inactivity; the first request
> after idle can take ~30–50s to wake up. Mention this if the reviewer hits a
> slow first load.

### Step 3 — Frontend on Vercel

1. https://vercel.com → **Add New** → **Project** → import the same GitHub repo.
2. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Environment variable:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | your Render backend URL from Step 2, e.g. `https://erp-crm-backend.onrender.com` |
4. Deploy. Note the URL, e.g. `https://erp-crm-portal.vercel.app`.
5. Go back to Render and update `CORS_ORIGIN` to this exact Vercel URL, then
   redeploy the backend (or restart the service) so CORS allows it.

### Step 4 — Verify end-to-end

1. Open the Vercel URL.
2. Log in with `admin@erp.test` / `Password123!`.
3. Create a customer, a product, and a sales challan; confirm it and check
   the product's stock decreased.

You now have everything the submission checklist asks for:
- GitHub repository link → your repo URL
- Live frontend URL → the Vercel URL
- Live backend API URL → the Render URL
- Test logins → table in root `README.md`
- Postman collection → `docs/postman_collection.json` (update its `base_url`
  variable to the Render URL before sharing)

---

## Path B — AWS EC2 (bonus)

This deploys both the API and a Postgres instance on a single free-tier EC2
box using Docker Compose (simplest AWS path; RDS is a heavier alternative).

1. **Launch an instance**: EC2 → Launch Instance → Ubuntu 22.04, `t2.micro`
   (free tier). Create/download a key pair. Security group: allow inbound
   `22` (SSH), `80`/`4000` (API), from your IP or `0.0.0.0/0` for the demo.
2. **SSH in**:
   ```bash
   ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
   ```
3. **Install Docker**:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin
   sudo usermod -aG docker $USER && newgrp docker
   ```
4. **Get the code onto the box**:
   ```bash
   git clone https://github.com/<your-username>/erp-crm-portal.git
   cd erp-crm-portal
   ```
5. **Set production secrets** — edit `docker-compose.yml`, replacing
   `JWT_SECRET` and `CORS_ORIGIN` with real values (or export them as env
   vars and reference `${VAR}` in the compose file).
6. **Run it**:
   ```bash
   docker compose up -d --build
   docker compose exec backend npx prisma migrate deploy
   docker compose exec backend npm run seed
   ```
7. API is now reachable at `http://<EC2_PUBLIC_IP>:4000`. Point the Vercel
   frontend's `VITE_API_URL` at this address (use an Elastic IP or a domain +
   HTTPS via nginx/Let's Encrypt for anything beyond a demo).
8. To also host the frontend on AWS instead of Vercel: build it locally
   (`npm run build` in `frontend/`) and upload `dist/` to an S3 bucket with
   static website hosting enabled, optionally fronted by CloudFront.

---

## Local-only fallback (no deployment)

If you choose not to deploy at all, the submission checklist asks for:
- Working local setup → this repo, following the root `README.md`
- Screen recording of the full flow → record login → create customer →
  create product → create + confirm a challan → show stock reduced
- Postman collection → `docs/postman_collection.json`
- Clear README instructions → root `README.md` + this file
