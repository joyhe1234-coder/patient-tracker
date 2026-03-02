# Patient Tracker - Disaster Recovery Runbook

This runbook provides step-by-step instructions for recovering the Patient Tracker application from various failure scenarios. Designed for clinic IT staff with minimal technical background.

---

## Table of Contents

1. [Recovery Targets](#recovery-targets)
2. [Backup Overview](#backup-overview)
3. [Scenario A: Server Hardware Failure](#scenario-a-server-hardware-failure)
4. [Scenario B: Database Corruption](#scenario-b-database-corruption)
5. [Scenario C: Ransomware Attack](#scenario-c-ransomware-attack)
6. [Scenario D: Accidental Bulk Delete](#scenario-d-accidental-bulk-delete)
7. [Scenario E: Render Cloud Failure](#scenario-e-render-cloud-failure)
8. [Quarterly Restore Test](#quarterly-restore-test)
9. [Emergency Contacts](#emergency-contacts)

---

## Recovery Targets

| Metric | Target | Meaning |
|--------|--------|---------|
| **RPO** (Recovery Point Objective) | **24 hours** | Maximum data loss = 1 day (last backup) |
| **RTO** (Recovery Time Objective) | **2 hours** | Time from disaster to application running again |

Backups run daily at 2:00 AM. In the worst case, you lose data entered since the last backup.

---

## Backup Overview

| Item | Details |
|------|---------|
| **Backup script** | `scripts\backup.ps1` — runs daily via Task Scheduler |
| **Local backups** | `C:\patient-tracker\backups\` |
| **Off-site backups** | Network share / NAS (configured in `.env` as `BACKUP_OFFSITE_PATH`) |
| **Encryption** | AES-256 via 7-Zip (key in `.env` as `BACKUP_ENCRYPTION_KEY`) |
| **Retention** | 7 daily + 4 weekly (Sunday) + 12 monthly (1st of month) |
| **Verification** | `scripts\verify-backup.ps1` — test-restores a backup file |
| **Backup log** | `C:\patient-tracker\backups\backup.log` |

### Finding Your Latest Backup

```powershell
# On the server
Get-ChildItem C:\patient-tracker\backups\patient-tracker-*.7z | Sort-Object Name -Descending | Select-Object -First 3

# On the NAS (substitute your path)
Get-ChildItem \\nas\backups\patient-tracker\patient-tracker-*.7z | Sort-Object Name -Descending | Select-Object -First 3
```

---

## Scenario A: Server Hardware Failure

**Situation:** The server is dead (motherboard, disk failure, fire, etc.). You need to restore on a completely new machine.

**What you need:**
- A new Windows Server machine (2019 or later)
- Latest backup file from the NAS (network share)
- The `BACKUP_ENCRYPTION_KEY` from your `.env` file (keep a secure copy off-server!)

### Steps

**1. Install Docker on the new server**

```powershell
# Download and install Docker Desktop
# https://docs.docker.com/desktop/install/windows-install/
# Restart when prompted, then switch to Linux containers
```

**2. Run the Patient Tracker installer**

```powershell
# Download and run the install script
Invoke-WebRequest `
  -Uri "https://raw.githubusercontent.com/joyhe1234-coder/patient-tracker/main/scripts/install-windows.ps1" `
  -OutFile "$env:TEMP\install-windows.ps1"

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
& "$env:TEMP\install-windows.ps1"
```

This creates a fresh `C:\patient-tracker` with empty containers.

**3. Copy the latest backup from the NAS**

```powershell
# Substitute your NAS path
Copy-Item "\\nas\backups\patient-tracker\patient-tracker-20260301-020000.sql.gz.7z" `
  C:\patient-tracker\backups\
```

**4. Update the encryption key in .env**

Open `C:\patient-tracker\.env` and set `BACKUP_ENCRYPTION_KEY` to the same key used when the backup was created.

**5. Restore the database**

```powershell
cd C:\patient-tracker
.\scripts\rollback.ps1 -Version latest -BackupFile backups\patient-tracker-20260301-020000.sql.gz.7z
```

> **Note:** If the backup file is `.sql.gz.7z` (encrypted), you must first decrypt it manually before using `rollback.ps1`, which expects a `.sql` file. Use:
> ```powershell
> & "C:\Program Files\7-Zip\7z.exe" x -p"YOUR_ENCRYPTION_KEY" backups\patient-tracker-20260301-020000.sql.gz.7z -obackups\
> # Then decompress the .gz:
> # Use PowerShell or 7-Zip to extract the .sql from the .gz
> & "C:\Program Files\7-Zip\7z.exe" x backups\patient-tracker-20260301-020000.sql.gz -obackups\
> .\scripts\rollback.ps1 -Version latest -BackupFile backups\patient-tracker-20260301-020000.sql
> ```

**6. Verify the restoration**

```powershell
.\scripts\verify-backup.ps1 -BackupFile backups\patient-tracker-20260301-020000.sql.gz.7z
.\scripts\validate-deployment.ps1
```

**7. Test in browser**

- Open the application URL
- Log in with your admin account
- Verify patient data is present and correct

**Estimated time:** 1-2 hours (mostly Docker install + image pulls).

---

## Scenario B: Database Corruption

**Situation:** The server is running, but the database has errors (corrupted tables, missing data, application errors pointing to DB issues).

### Steps

**1. Take a backup of the current (corrupt) state**

```powershell
cd C:\patient-tracker
.\scripts\backup.ps1
# This captures the current state — even if corrupt, it may be useful for forensics
```

**2. Identify the last known-good backup**

```powershell
# List recent backups by date
Get-ChildItem C:\patient-tracker\backups\patient-tracker-*.7z | Sort-Object Name -Descending | Select-Object -First 5
```

**3. Verify the backup before restoring**

```powershell
.\scripts\verify-backup.ps1 -BackupFile backups\patient-tracker-20260228-020000.sql.gz.7z
# Wait for PASS before proceeding
```

**4. Restore from the verified backup**

Decrypt and decompress the backup, then restore:

```powershell
# Decrypt
& "C:\Program Files\7-Zip\7z.exe" x -p"YOUR_ENCRYPTION_KEY" backups\patient-tracker-20260228-020000.sql.gz.7z -obackups\
# Decompress
& "C:\Program Files\7-Zip\7z.exe" x backups\patient-tracker-20260228-020000.sql.gz -obackups\
# Restore
.\scripts\rollback.ps1 -Version latest -BackupFile backups\patient-tracker-20260228-020000.sql
```

**5. Verify in browser**

- Log in and check patient data
- Compare patient counts with what you expect

**Data loss:** Up to 24 hours of data entered since the backup.

---

## Scenario C: Ransomware Attack

**Situation:** Server files are encrypted by ransomware. Local backups may be compromised.

### Steps

**1. Disconnect the server from the network immediately**

This prevents the ransomware from spreading to the NAS or other machines.

**2. Do NOT pay the ransom**

**3. Restore from the NAS backup**

Since the NAS is on a separate device, its backups should be unaffected:

```powershell
# On a clean machine (or after wiping and reinstalling the server OS)
# Follow Scenario A steps, using the backup from the NAS
```

**4. Change all passwords after restoration**

- Change the admin password in the app
- Change the `DB_PASSWORD` and `JWT_SECRET` in `.env`
- Change the `BACKUP_ENCRYPTION_KEY`
- Regenerate any GHCR tokens

**5. Investigate how the ransomware got in**

- Check Windows Event Logs (if available)
- Update Windows, Docker, and all software
- Review firewall rules

### Prevention Tips

- Keep the NAS on a separate network segment if possible
- Use read-only NAS shares for backup retention (append-only)
- Keep Windows Server updated
- Restrict RDP access (use VPN only)

---

## Scenario D: Accidental Bulk Delete

**Situation:** A user accidentally deleted many patients or made incorrect bulk changes.

### Option 1: Full Restore (if data loss since backup is acceptable)

Follow Scenario B steps to restore from the latest backup.

### Option 2: Selective Recovery (if recent data must be preserved)

**1. Check the audit log first**

In the Patient Tracker app, go to **Admin > Audit Log** to see what was deleted and when.

**2. If only a few records were deleted:**

Manually re-enter the deleted patients using the audit log as reference.

**3. If many records were deleted:**

Restore the full database from backup (Option 1). Any data entered between the backup and the deletion will be lost.

---

## Scenario E: Render Cloud Failure

**Situation:** The cloud-hosted version on Render is down or data is lost.

### For Paid PostgreSQL Plans

1. Go to the **Render Dashboard** > **Database** > **Backups**
2. Click **Restore** on the most recent backup
3. Wait for the restore to complete
4. Verify the app is working

### For Manual Recovery

```bash
# If you have a local pg_dump from the Render database:
pg_dump -h <render-external-host> -U <user> -d <database> > render-backup.sql

# Restore to a new database on Render or locally
```

### Getting a Local Copy from Render

```bash
# Use the external connection string from Render dashboard
pg_dump "postgresql://user:pass@host:5432/dbname" > render-backup-$(date +%Y%m%d).sql
```

---

## Quarterly Restore Test

**Run this test every 3 months** to confirm backups actually work. Schedule it on a weekday when you have time (takes ~30 minutes).

### Checklist

| # | Step | Status |
|---|------|--------|
| 1 | Pick the most recent weekly backup from the NAS | [ ] |
| 2 | Run `verify-backup.ps1` against it | [ ] |
| 3 | Record the result (PASS/FAIL, table counts, schema version) | [ ] |
| 4 | Verify the backup log shows daily SUCCESS entries for the past week | [ ] |
| 5 | Confirm off-site copies exist on the NAS for the past week | [ ] |
| 6 | Confirm you have a secure copy of `BACKUP_ENCRYPTION_KEY` stored off-server | [ ] |

### Full Restore Test (Annual — Recommended)

Once a year, perform a full disaster recovery drill:

| # | Step | Status |
|---|------|--------|
| 1 | Set up a test machine (or VM) with Docker | [ ] |
| 2 | Run `install-windows.ps1` on the test machine | [ ] |
| 3 | Copy latest backup from NAS to the test machine | [ ] |
| 4 | Restore using `rollback.ps1` | [ ] |
| 5 | Log in and verify patient data looks correct | [ ] |
| 6 | Run `validate-deployment.ps1` — should report GO | [ ] |
| 7 | Document test date, result, and any issues | [ ] |

### Recording Results

Record each test in a simple log:

```
Date: 2026-03-15
Tester: [your name]
Backup file: patient-tracker-20260314-020000.sql.gz.7z
verify-backup.ps1 result: PASS
Tables: 8 | Patients: 1247 | Users: 5
Schema: 20260205070000_add_audit_log
Notes: All checks passed. NAS had 7 daily + 3 weekly backups.
```

---

## Emergency Contacts

| Role | Contact | When to Call |
|------|---------|-------------|
| Application Developer | [your developer contact] | App errors, failed migrations, code bugs |
| IT Administrator | [your IT contact] | Server hardware, network, NAS, Docker issues |
| Render Support | https://render.com/support | Cloud deployment issues |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `scripts\backup.ps1` | Daily automated backup (Task Scheduler) |
| `scripts\verify-backup.ps1` | Verify backup integrity |
| `scripts\rollback.ps1` | Restore database from backup |
| `scripts\install-windows.ps1` | Fresh server installation |
| `scripts\validate-deployment.ps1` | Health check all components |
| `scripts\update.ps1` | Update to new version |
| `C:\patient-tracker\.env` | Configuration (contains encryption key) |
| `C:\patient-tracker\backups\` | Local backup storage |
| `C:\patient-tracker\backups\backup.log` | Backup history log |

---

*Last Updated: March 2026*
