-- Convert single role + canHavePatients to roles array

-- Step 1: Add new roles column as array
ALTER TABLE "users" ADD COLUMN "roles" "UserRole"[];

-- Step 2: Migrate existing data
-- PHYSICIAN -> [PHYSICIAN]
-- STAFF -> [STAFF]
-- ADMIN with can_have_patients=true -> [ADMIN, PHYSICIAN]
-- ADMIN with can_have_patients=false -> [ADMIN]
UPDATE "users" SET "roles" =
  CASE
    WHEN "role" = 'PHYSICIAN' THEN ARRAY['PHYSICIAN']::"UserRole"[]
    WHEN "role" = 'STAFF' THEN ARRAY['STAFF']::"UserRole"[]
    WHEN "role" = 'ADMIN' AND "can_have_patients" = true THEN ARRAY['ADMIN', 'PHYSICIAN']::"UserRole"[]
    WHEN "role" = 'ADMIN' THEN ARRAY['ADMIN']::"UserRole"[]
    ELSE ARRAY['PHYSICIAN']::"UserRole"[]
  END;

-- Step 3: Set default for new users
ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['PHYSICIAN']::"UserRole"[];

-- Step 4: Make roles NOT NULL (after data migration)
ALTER TABLE "users" ALTER COLUMN "roles" SET NOT NULL;

-- Step 5: Drop old columns
ALTER TABLE "users" DROP COLUMN "role";
ALTER TABLE "users" DROP COLUMN "can_have_patients";
