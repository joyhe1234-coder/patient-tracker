-- CreateEnum
CREATE TYPE "ImportTargetType" AS ENUM ('PATIENT', 'MEASURE', 'DATA', 'IGNORED');

-- CreateTable
CREATE TABLE "import_mapping_overrides" (
    "id" SERIAL NOT NULL,
    "system_id" TEXT NOT NULL,
    "source_column" TEXT NOT NULL,
    "target_type" "ImportTargetType" NOT NULL,
    "target_field" TEXT,
    "request_type" TEXT,
    "quality_measure" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_mapping_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_action_overrides" (
    "id" SERIAL NOT NULL,
    "system_id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "quality_measure" TEXT NOT NULL,
    "measure_status" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_action_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_mapping_overrides_system_id_idx" ON "import_mapping_overrides"("system_id");

-- CreateIndex
CREATE UNIQUE INDEX "import_mapping_overrides_system_id_source_column_key" ON "import_mapping_overrides"("system_id", "source_column");

-- CreateIndex
CREATE INDEX "import_action_overrides_system_id_idx" ON "import_action_overrides"("system_id");

-- CreateIndex
CREATE UNIQUE INDEX "import_action_overrides_system_id_pattern_key" ON "import_action_overrides"("system_id", "pattern");

-- AddForeignKey
ALTER TABLE "import_mapping_overrides" ADD CONSTRAINT "import_mapping_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_action_overrides" ADD CONSTRAINT "import_action_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
