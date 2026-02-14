-- AlterTable: Add insurance_group column to patients
ALTER TABLE "patients" ADD COLUMN "insurance_group" TEXT;

-- CreateIndex: Add index on insurance_group for efficient filtering
CREATE INDEX "patients_insurance_group_idx" ON "patients"("insurance_group");

-- DataMigration: Set existing patients to 'hill' (idempotent)
UPDATE "patients" SET "insurance_group" = 'hill' WHERE "insurance_group" IS NULL;
