-- AlterTable
ALTER TABLE "patient_measures" ALTER COLUMN "request_type" DROP NOT NULL,
ALTER COLUMN "quality_measure" DROP NOT NULL,
ALTER COLUMN "measure_status" DROP NOT NULL,
ALTER COLUMN "measure_status" DROP DEFAULT;
