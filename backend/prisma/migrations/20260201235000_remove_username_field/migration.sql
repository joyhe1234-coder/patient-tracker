-- Remove username field and use email instead

-- 1. Add user_email column to audit_log
ALTER TABLE "audit_log" ADD COLUMN "user_email" TEXT;

-- 2. Copy username to user_email in audit_log before dropping
UPDATE "audit_log" SET "user_email" = "username" WHERE "username" IS NOT NULL;

-- 3. Drop username column from audit_log
ALTER TABLE "audit_log" DROP COLUMN "username";

-- 4. Drop username column from users table
ALTER TABLE "users" DROP COLUMN "username";

-- 5. Rename locked_by_username to locked_by_email in edit_lock
ALTER TABLE "edit_lock" RENAME COLUMN "locked_by_username" TO "locked_by_email";

-- 6. Create index on user_email
CREATE INDEX "audit_log_user_email_idx" ON "audit_log"("user_email");
