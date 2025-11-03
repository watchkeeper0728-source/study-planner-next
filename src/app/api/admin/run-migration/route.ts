import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Temporary endpoint to run database migration
 * This should be deleted after migration is complete
 * SECURITY: In production, this should be protected with authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Simple security check - use a secret token from environment variable
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.MIGRATION_SECRET_TOKEN || 'temp-migration-token-change-in-production'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[MIGRATION] Starting database migration...')

    const migrationSQL = `
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
    `

    // Execute migration SQL
    await prisma.$executeRawUnsafe(migrationSQL)

    // Verify migration
    const columnCheck: any[] = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('username', 'lastLoginAt')
      ORDER BY column_name
    `

    console.log('[MIGRATION] Migration completed successfully')
    console.log('[MIGRATION] Verified columns:', columnCheck)

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      columns: columnCheck,
    })
  } catch (error: any) {
    console.error('[MIGRATION] Migration error:', error)
    return NextResponse.json(
      {
        error: error?.message || 'Migration failed',
        details: error?.stack,
      },
      { status: 500 }
    )
  }
}

