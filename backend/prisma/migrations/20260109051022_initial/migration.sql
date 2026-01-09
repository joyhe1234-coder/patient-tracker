-- CreateTable
CREATE TABLE "patients" (
    "id" SERIAL NOT NULL,
    "member_name" TEXT NOT NULL,
    "member_dob" DATE NOT NULL,
    "member_telephone" TEXT,
    "member_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_measures" (
    "id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "request_type" TEXT NOT NULL,
    "quality_measure" TEXT NOT NULL,
    "measure_status" TEXT NOT NULL DEFAULT 'Not Addressed',
    "status_date" DATE,
    "status_date_prompt" TEXT,
    "tracking_1" TEXT,
    "tracking_2" TEXT,
    "tracking_3" TEXT,
    "due_date" DATE,
    "time_interval_days" INTEGER,
    "notes" TEXT,
    "row_order" INTEGER NOT NULL DEFAULT 0,
    "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "hgba1c_goal" TEXT,
    "hgba1c_goal_reached_year" BOOLEAN NOT NULL DEFAULT false,
    "hgba1c_declined" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_measures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_request_types" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "auto_quality_measure" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "config_request_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_quality_measures" (
    "id" SERIAL NOT NULL,
    "request_type_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "allow_duplicates" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "config_quality_measures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_measure_statuses" (
    "id" SERIAL NOT NULL,
    "quality_measure_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date_prompt" TEXT,
    "base_due_days" INTEGER,
    "show_due_date_input" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "config_measure_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_tracking_options" (
    "id" SERIAL NOT NULL,
    "measure_status_id" INTEGER NOT NULL,
    "tracking_number" INTEGER NOT NULL,
    "option_value" TEXT,
    "default_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "config_tracking_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_due_day_rules" (
    "id" SERIAL NOT NULL,
    "measure_status_id" INTEGER NOT NULL,
    "tracking_value" TEXT,
    "due_days" INTEGER NOT NULL,

    CONSTRAINT "config_due_day_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_hgba1c_goals" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "threshold" DECIMAL(3,1) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "config_hgba1c_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_conditional_formats" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "condition_type" TEXT NOT NULL,
    "condition_value" TEXT NOT NULL,
    "background_color" TEXT NOT NULL,
    "text_color" TEXT NOT NULL DEFAULT '#000000',
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "config_conditional_formats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_hcc_codes" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icd10_code" TEXT NOT NULL,
    "raf_value" DECIMAL(5,3) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reference_hcc_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edit_lock" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "locked_by_username" TEXT,
    "locked_by_display_name" TEXT,
    "locked_at" TIMESTAMP(3),
    "last_activity" TIMESTAMP(3),

    CONSTRAINT "edit_lock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entity_id" INTEGER,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_member_name_member_dob_key" ON "patients"("member_name", "member_dob");

-- CreateIndex
CREATE INDEX "patient_measures_patient_id_idx" ON "patient_measures"("patient_id");

-- CreateIndex
CREATE INDEX "patient_measures_quality_measure_idx" ON "patient_measures"("quality_measure");

-- CreateIndex
CREATE INDEX "patient_measures_measure_status_idx" ON "patient_measures"("measure_status");

-- CreateIndex
CREATE INDEX "patient_measures_due_date_idx" ON "patient_measures"("due_date");

-- CreateIndex
CREATE INDEX "patient_measures_status_date_idx" ON "patient_measures"("status_date");

-- CreateIndex
CREATE UNIQUE INDEX "config_request_types_code_key" ON "config_request_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "config_quality_measures_request_type_id_code_key" ON "config_quality_measures"("request_type_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "config_measure_statuses_quality_measure_id_code_key" ON "config_measure_statuses"("quality_measure_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "config_due_day_rules_measure_status_id_tracking_value_key" ON "config_due_day_rules"("measure_status_id", "tracking_value");

-- CreateIndex
CREATE UNIQUE INDEX "config_hgba1c_goals_code_key" ON "config_hgba1c_goals"("code");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "audit_log_username_idx" ON "audit_log"("username");

-- CreateIndex
CREATE INDEX "audit_log_entity_entity_id_idx" ON "audit_log"("entity", "entity_id");

-- AddForeignKey
ALTER TABLE "patient_measures" ADD CONSTRAINT "patient_measures_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_quality_measures" ADD CONSTRAINT "config_quality_measures_request_type_id_fkey" FOREIGN KEY ("request_type_id") REFERENCES "config_request_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_measure_statuses" ADD CONSTRAINT "config_measure_statuses_quality_measure_id_fkey" FOREIGN KEY ("quality_measure_id") REFERENCES "config_quality_measures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_tracking_options" ADD CONSTRAINT "config_tracking_options_measure_status_id_fkey" FOREIGN KEY ("measure_status_id") REFERENCES "config_measure_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_due_day_rules" ADD CONSTRAINT "config_due_day_rules_measure_status_id_fkey" FOREIGN KEY ("measure_status_id") REFERENCES "config_measure_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
