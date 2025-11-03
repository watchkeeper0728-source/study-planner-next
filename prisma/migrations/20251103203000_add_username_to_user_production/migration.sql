-- Add username column to users table for production
-- This migration is idempotent and safe to run multiple times

-- Add username column if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;

-- Set username for existing users (use id as fallback if username is null)
UPDATE "users" SET "username" = "id" WHERE "username" IS NULL;

-- Create unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- Make username NOT NULL (after all rows have values)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'username' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
    END IF;
END $$;

-- Add lastLoginAt column if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;

