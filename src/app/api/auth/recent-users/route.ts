import { NextRequest, NextResponse } from 'next/server'
import { getRecentUsers } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get all query parameters for debugging
    const searchParams = request.nextUrl.searchParams
    const migrateParam = searchParams.get('migrate')
    const runMigrationParam = searchParams.get('run-migration')
    
    // Check if migration should be triggered
    const shouldMigrate = 
      migrateParam === 'true' || 
      migrateParam === '1' ||
      migrateParam === expectedToken ||
      runMigrationParam === expectedToken ||
      migrateParam === (process.env.MIGRATION_SECRET_TOKEN || 'temp-migration-token-change-in-production') ||
      runMigrationParam === (process.env.MIGRATION_SECRET_TOKEN || 'temp-migration-token-change-in-production')
    
    const envToken = process.env.MIGRATION_SECRET_TOKEN
    const expectedToken = envToken || 'temp-migration-token-change-in-production'
    
    console.log('[MIGRATION DEBUG] migrateParam:', migrateParam)
    console.log('[MIGRATION DEBUG] runMigrationParam:', runMigrationParam)
    console.log('[MIGRATION DEBUG] shouldMigrate:', shouldMigrate)
    console.log('[MIGRATION DEBUG] Env token exists:', !!envToken)
    console.log('[MIGRATION DEBUG] Expected token:', expectedToken)
    console.log('[MIGRATION DEBUG] All query params:', Object.fromEntries(searchParams.entries()))
    
    if (shouldMigrate) {
      // Run migration
      try {
        console.log('[MIGRATION] Starting database migration via recent-users endpoint...')
        
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

        await prisma.$executeRawUnsafe(migrationSQL)

        // Verify migration
        const columnCheck: any[] = await prisma.$queryRaw`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'users'
          AND column_name IN ('username', 'lastLoginAt')
          ORDER BY column_name
        `

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
    
    // Normal flow: get recent users
    const users = await getRecentUsers(3)
    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('[AUTH API] Get recent users error:', error)
    return NextResponse.json(
      { error: error?.message || 'ユーザー一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

