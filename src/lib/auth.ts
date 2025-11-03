import { prisma } from './prisma'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'

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

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    })

    if (!session || session.expires < new Date()) {
      // Session does not exist or expired
      if (session) {
        // Delete expired session
        await prisma.session.delete({ where: { id: session.id } })
      }
      return null
    }

    // Type assertion: Prisma Client may have old type definitions during migration
    // @ts-ignore - Bypass type checking for username property
    const user: any = session.user
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
      const { randomBytes } = await import('crypto')
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

    // Create session
    const expires = new Date()
    expires.setDate(expires.getDate() + SESSION_EXPIRES_DAYS)

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    })

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
      sessionToken,
    }
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
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    })

    if (!session || session.expires < new Date()) {
      return null
    }

    // Type assertion: Prisma Client may have old type definitions during migration
    // @ts-ignore - Bypass type checking for username property
    const user: any = session.user

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

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
      await prisma.session.delete({
        where: { sessionToken },
      })
    }
  } catch (error) {
    console.error('[AUTH] Error signing out:', error)
  }
}

/**
 * Get recently logged in users (max 3)
 */
export async function getRecentUsers(limit: number = 3): Promise<{ username: string; name: string | null; lastLoginAt: Date | null }[]> {
  try {
    const users = await prisma.user.findMany({
      where: {
        lastLoginAt: { not: null },
      },
      orderBy: {
        lastLoginAt: 'desc',
      },
      take: limit,
      select: {
        username: true,
        name: true,
        lastLoginAt: true,
      },
    })

    return users.map((u) => ({
      username: u.username,
      name: u.name,
      lastLoginAt: u.lastLoginAt,
    }))
  } catch (error) {
    console.error('[AUTH] Error getting recent users:', error)
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