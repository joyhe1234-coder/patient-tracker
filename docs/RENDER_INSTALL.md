# Patient Tracker - Render Deployment Guide

This guide covers deploying Patient Tracker on [Render](https://render.com).

---

## Overview

The application consists of 3 services on Render:

| Service | Type | Purpose |
|---------|------|---------|
| `patient-tracker-api` | Web Service | Backend API (Node.js) |
| `patient-tracker-frontend` | Static Site | Frontend (React) |
| `patient-tracker-db` | PostgreSQL | Database |

---

## Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → **New** → **PostgreSQL**
2. Configure:
   - **Name:** `patient-tracker-db`
   - **Database:** `patienttracker`
   - **User:** `appuser`
   - **Region:** Choose closest to your users
   - **Plan:** Choose based on needs (Free tier available)
3. Click **Create Database**
4. Wait for database to be ready
5. Copy the **Internal Database URL** (you'll need this later)

---

## Step 2: Create Backend Service

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `patient-tracker-api`
   - **Region:** Same as database
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm ci && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && node dist/index.js`

4. Add **Environment Variables:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (paste Internal Database URL from Step 1) |
| `JWT_SECRET` | (generate with `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `8h` |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://patient-tracker-frontend.onrender.com` |

5. Click **Create Web Service**

---

## Step 3: Create Frontend Service

1. Go to Render Dashboard → **New** → **Static Site**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `patient-tracker-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `dist`

4. Add **Environment Variables:**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://patient-tracker-api.onrender.com` |

5. Click **Create Static Site**

---

## Step 4: Initialize Database

After backend deploys successfully:

1. Go to backend service → **Shell** tab
2. Run:
```bash
npm run db:seed
```

---

## Step 5: Create Admin User

In the same shell:

```bash
npm run reset-password admin@yourcompany.com YourSecurePassword123!
```

---

## Step 6: Access Application

Open: `https://patient-tracker-frontend.onrender.com`

Login with the admin credentials you created.

---

## Environment Variables Reference

### Required

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET` | Backend | 64-char secret for auth tokens |
| `NODE_ENV` | Backend | Set to `production` |
| `VITE_API_URL` | Frontend | Backend API URL |

### Optional

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `JWT_EXPIRES_IN` | Backend | `8h` | Token expiration |
| `APP_URL` | Backend | - | Public URL for email links |

### SMTP (Optional - for Password Reset Emails)

If not configured, "Forgot Password" will show "Contact Administrator".

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | Email server hostname |
| `SMTP_PORT` | Email server port (usually 587) |
| `SMTP_SECURE` | Use SSL (true for port 465) |
| `SMTP_USER` | Email account username |
| `SMTP_PASS` | Email account password |
| `SMTP_FROM` | From address for emails |

To add SMTP:
1. Go to Render Dashboard → `patient-tracker-api` → **Environment**
2. Add the SMTP variables
3. Click **Save Changes** (triggers redeploy)

---

## How to Update

Render automatically deploys when you push to the `main` branch.

**Manual deploy:**
1. Go to service in Render Dashboard
2. Click **Manual Deploy** → **Deploy latest commit**

**Check deploy status:**
1. Go to service → **Events** tab
2. Look for "Deploy succeeded" or check logs for errors

---

## Database Backups

### Automatic Backups (Paid Plans)

Render provides automatic daily backups on paid PostgreSQL plans.

### Manual Backup

1. Go to Render Dashboard → `patient-tracker-db`
2. Copy the **External Database URL**
3. On your local machine:
```bash
pg_dump "YOUR_EXTERNAL_DATABASE_URL" > backup.sql
```

### Restore

```bash
psql "YOUR_EXTERNAL_DATABASE_URL" < backup.sql
```

---

## Troubleshooting

### Backend not starting

1. Go to service → **Logs** tab
2. Check for errors
3. Common issues:
   - `DATABASE_URL` not set or incorrect
   - `JWT_SECRET` not set
   - Database not ready yet

### Frontend shows "Network Error"

1. Check `VITE_API_URL` is set correctly
2. Check backend service is running
3. Check backend URL matches exactly (including https://)

### Database connection refused

1. Ensure database is in same region as backend
2. Use **Internal Database URL** (not External)
3. Check database is running in Render Dashboard

### CORS errors

1. Check `APP_URL` in backend matches frontend URL
2. Redeploy backend after changing environment variables

---

## Costs

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Web Service | 750 hrs/month | Spins down after 15min inactivity |
| Static Site | Unlimited | Free for static sites |
| PostgreSQL | 1 GB, 90 days | Then requires paid plan |

For production, consider paid plans for:
- Always-on backend (no spin-down delay)
- Persistent database
- Automatic backups

---

## Service IDs (for API access)

After creating services, note the service IDs from the URL:
- Format: `https://dashboard.render.com/web/srv-XXXX`
- The `srv-XXXX` part is the service ID

These are used for API access and monitoring.

---

*Last Updated: February 2, 2026*
