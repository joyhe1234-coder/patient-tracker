-- AlterTable: Remove tracking_3 column (unused placeholder field)
ALTER TABLE "patient_measures" DROP COLUMN IF EXISTS "tracking_3";
