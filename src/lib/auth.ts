import { prisma } from './prisma'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'
import { randomBytes } from 'crypto'

// Session expiration (30 days)
const SESSION_EXPIRES_DAYS = 30

export interface SessionUser {
  id: string
  username: string
  name: string | null
}

/**
 * Get session
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return null
    }

    // Use raw SQL to get session and user data
    // Handle case where username column might not exist yet
    let sessions: any[]
    try {
      // Check if username column exists
      const columnCheck: any[] = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'username'
        LIMIT 1
      `
      
      if (columnCheck.length > 0) {
        // Username column exists, use it
        sessions = await prisma.$queryRaw`
          SELECT s.id, s."sessionToken", s."userId", s.expires,
                 u.id as "userId", u.username, u.name
          FROM sessions s
          INNER JOIN users u ON s."userId" = u.id
          WHERE s."sessionToken" = ${sessionToken}
          LIMIT 1
        `
      } else {
        // Username column doesn't exist yet, use id as fallback
        sessions = await prisma.$queryRaw`
          SELECT s.id, s."sessionToken", s."userId", s.expires,
                 u.id as "userId", u.id as username, u.name
          FROM sessions s
          INNER JOIN users u ON s."userId" = u.id
          WHERE s."sessionToken" = ${sessionToken}
          LIMIT 1
        `
      }
    } catch (error) {
      console.error('[AUTH] Error querying session:', error)
      return null
    }

    if (sessions.length === 0) {
      return null
    }

    const sessionData = sessions[0]

    if (!sessionData || new Date(sessionData.expires) < new Date()) {
      // Session expired, delete it
      if (sessionData) {
        await prisma.$executeRaw`
          DELETE FROM sessions WHERE id = ${sessionData.id}
        `
      }
      return null
    }

    const user = {
      id: sessionData.userId,
      username: sessionData.username,
      name: sessionData.name,
    }
    const username = user.username || user.id

    return {
      id: user.id,
      username,
      name: user.name,
    }
  } catch (error) {
    console.error('[AUTH] Error getting session:', error)
    return null
  }
}

/**
 * Sign in with username
 */
export async function signIn(username: string): Promise<{ user: SessionUser; sessionToken: string } | null> {
  try {
    console.log('[AUTH] Starting sign in for username:', username)
    
    // Check database connection
    try {
      await prisma.$connect()
      console.log('[AUTH] Database connected')
    } catch (dbError) {
      console.error('[AUTH] Database connection error:', dbError)
      throw new Error('データベースに接続できませんでした')
    }

    // Use raw SQL query as workaround until Prisma Client is regenerated
    console.log('[AUTH] Looking up user by username using raw SQL')
    
    // First check if username column exists
    const columnCheck: any[] = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'username'
      LIMIT 1
    `
    
    if (columnCheck.length === 0) {
      console.error('[AUTH] username column does not exist in database. Migration needs to be applied.')
      throw new Error('データベースのマイグレーションが適用されていません。管理者に連絡してください。')
    }
    
    const existingUsers: any[] = await prisma.$queryRaw`
      SELECT id, username, name
      FROM users
      WHERE username = ${username}
      LIMIT 1
    `

    let user: any = existingUsers[0]
    console.log('[AUTH] User lookup result:', user ? 'found' : 'not found')

    if (!user) {
      console.log('[AUTH] Creating new user using raw SQL')
      // Generate a new ID using cuid format (similar to Prisma's default)
      const idBytes = randomBytes(16)
      const newId = 'c' + idBytes.toString('base64url').substring(0, 24).replace(/[+\/=]/g, '')
      
      // Create new user using raw SQL
      await prisma.$executeRaw`
        INSERT INTO users (id, username, name, tz, "createdAt", "updatedAt")
        VALUES (${newId}, ${username}, ${username}, 'Asia/Tokyo', NOW(), NOW())
      `
      
      // Fetch the created user
      const newUsers: any[] = await prisma.$queryRaw`
        SELECT id, username, name
        FROM users
        WHERE username = ${username}
        LIMIT 1
      `
      user = newUsers[0]
      console.log('[AUTH] New user created:', user.id)
    } else {
      console.log('[AUTH] Updating last login time for existing user')
      // Update last login time using raw SQL
      await prisma.$executeRaw`
        UPDATE users
        SET "lastLoginAt" = NOW()
        WHERE id = ${user.id}
      `
      console.log('[AUTH] Last login time updated')
    }

    // Generate session token
    const sessionToken = nanoid(32)
    console.log('[AUTH] Generated session token')

    // Create session using raw SQL
    const expires = new Date()
    expires.setDate(expires.getDate() + SESSION_EXPIRES_DAYS)
    console.log('[AUTH] Session expires at:', expires)

    await prisma.$executeRaw`
      INSERT INTO sessions (id, "sessionToken", "userId", expires)
      VALUES (gen_random_uuid()::text, ${sessionToken}, ${user.id}, ${expires})
    `
    console.log('[AUTH] Session created successfully')

    const userUsername = user.username || user.id

    const result = {
      user: {
        id: user.id,
        username: userUsername,
        name: user.name,
      },
      sessionToken,
    }
    
    console.log('[AUTH] Sign in successful, returning result')
    return result
  } catch (error) {
    console.error('[AUTH] Error signing in:', error)
    return null
  }
}

/**
 * Sign in with session token (for recent login button)
 */
export async function signInWithToken(sessionToken: string): Promise<SessionUser | null> {
  try {
    // Use raw SQL to get session and user data
    const sessions: any[] = await prisma.$queryRaw`
      SELECT s.id, s."sessionToken", s."userId", s.expires,
             u.id as "userId", u.username, u.name
      FROM sessions s
      INNER JOIN users u ON s."userId" = u.id
      WHERE s."sessionToken" = ${sessionToken}
      LIMIT 1
    `

    if (sessions.length === 0) {
      return null
    }

    const sessionData = sessions[0]

    if (!sessionData || new Date(sessionData.expires) < new Date()) {
      return null
    }

    const user = {
      id: sessionData.userId,
      username: sessionData.username,
      name: sessionData.name,
    }

    // Update last login time using raw SQL
    await prisma.$executeRaw`
      UPDATE users
      SET "lastLoginAt" = NOW()
      WHERE id = ${user.id}
    `

    const username = user.username || user.id

    return {
      id: user.id,
      username,
      name: user.name,
    }
  } catch (error) {
    console.error('[AUTH] Error signing in with token:', error)
    return null
  }
}

/**
 * Sign out
 */
export async function signOut(sessionToken?: string): Promise<void> {
  try {
    if (sessionToken) {
      await prisma.$executeRaw`
        DELETE FROM sessions WHERE "sessionToken" = ${sessionToken}
      `
    }
  } catch (error) {
    console.error('[AUTH] Error signing out:', error)
  }
}

/**
 * Get recently logged in users (max 3) with their active session tokens
 */
export async function getRecentUsers(limit: number = 3): Promise<{ username: string; name: string | null; lastLoginAt: Date | null; sessionToken: string | null }[]> {
  try {
    // Use raw SQL query to get recent users with their active sessions
    // Handle case where username column might not exist yet
    try {
      // First check if username column exists
      const columnCheck: any[] = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'username'
        LIMIT 1
      `
      
      if (columnCheck.length === 0) {
        // Username column doesn't exist yet, return empty array
        console.warn('[AUTH] username column does not exist in database yet')
        return []
      }

      const users: any[] = await prisma.$queryRaw`
        SELECT 
          u.id,
          u.username,
          u.name,
          u."lastLoginAt",
          s."sessionToken"
        FROM users u
        LEFT JOIN LATERAL (
          SELECT "sessionToken"
          FROM sessions
          WHERE "userId" = u.id
            AND expires > NOW()
          ORDER BY expires DESC
          LIMIT 1
        ) s ON true
        WHERE u."lastLoginAt" IS NOT NULL
        ORDER BY u."lastLoginAt" DESC
        LIMIT ${limit}
      `
      
      return users.map((u: any) => ({
        username: u.username || u.id,
        name: u.name,
        lastLoginAt: u.lastLoginAt,
        sessionToken: u.sessionToken || null,
      }))
    } catch (rawError) {
      console.error('[AUTH] Raw query error, returning empty array:', rawError)
      return []
    }
  } catch (error) {
    console.error('[AUTH] Error getting recent users:', error)
    if (error instanceof Error) {
      console.error('[AUTH] Error details:', error.message)
    }
    return []
  }
}

/**
 * Validate username
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: '\u30e6\u30fc\u30b6\u30fc\u540d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044' }
  }

  const trimmed = username.trim()

  if (trimmed.length < 2) {
    return { valid: false, error: '\u30e6\u30fc\u30b6\u30fc\u540d\u306f2\u6587\u5b57\u4ee5\u4e0a\u3067\u3042\u308b\u5fc5\u8981\u304c\u3042\u308a\u307e\u3059' }
  }

  if (trimmed.length > 20) {
    return { valid: false, error: '\u30e6\u30fc\u30b6\u30fc\u540d\u306f20\u6587\u5b57\u4ee5\u4e0a\u3067\u3042\u308b\u5fc5\u8981\u304c\u3042\u308a\u307e\u3059' }
  }

  // Only allow alphanumeric characters, underscore, and hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: '\u30e6\u30fc\u30b6\u30fc\u540d\u306f\u82f1\u6570\u5b57\u3001\u30a2\u30f3\u30c0\u30fc\u30b9\u30b3\u30a2(_)\u3001\u30cf\u30a4\u30d5\u30f3(-)\u306e\u307f\u4f7f\u7528\u3067\u304d\u307e\u3059' }
  }

  return { valid: true }
}