import { prisma } from './prisma'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'

// 繧ｻ繝・す繝ｧ繝ｳ譛牙柑譛滄剞・・0譌･・・const SESSION_EXPIRES_DAYS = 30

export interface SessionUser {
  id: string
  username: string
  name: string | null
}

/**
 * 繧ｻ繝・す繝ｧ繝ｳ繧貞叙蠕・ */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return null
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    })

    if (!session || session.expires < new Date()) {
      // 繧ｻ繝・す繝ｧ繝ｳ縺悟ｭ伜惠縺励↑縺・√∪縺溘・譛滄剞蛻・ｌ
      if (session) {
        // 譛滄剞蛻・ｌ繧ｻ繝・す繝ｧ繝ｳ繧貞炎髯､
        await prisma.session.delete({ where: { id: session.id } })
      }
      return null
    }

    // Type assertion: Prisma Client may have old type definitions
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
 * 繝ｦ繝ｼ繧ｶ繝ｼ蜷阪〒繝ｭ繧ｰ繧､繝ｳ
 */
export async function signIn(username: string): Promise<{ user: SessionUser; sessionToken: string } | null> {
  try {
    // 繝ｦ繝ｼ繧ｶ繝ｼ繧呈､懃ｴ｢縺ｾ縺溘・菴懈・
    let user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      // 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ繧剃ｽ懈・
      user = await prisma.user.create({
        data: {
          username,
          name: username,
        },
      })
    } else {
      // 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ縺ｮ譛邨ゅΟ繧ｰ繧､繝ｳ譎ょ綾繧呈峩譁ｰ
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
    }

    // 繧ｻ繝・す繝ｧ繝ｳ繝医・繧ｯ繝ｳ繧堤函謌・    const sessionToken = nanoid(32)

    // 繧ｻ繝・す繝ｧ繝ｳ繧剃ｽ懈・
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
 * 繧ｻ繝・す繝ｧ繝ｳ繝医・繧ｯ繝ｳ縺ｧ繝ｭ繧ｰ繧､繝ｳ・育峩霑代Ο繧ｰ繧､繝ｳ繝懊ち繝ｳ逕ｨ・・ */
export async function signInWithToken(sessionToken: string): Promise<SessionUser | null> {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    })

    if (!session || session.expires < new Date()) {
      return null
    }

    // 譛邨ゅΟ繧ｰ繧､繝ｳ譎ょ綾繧呈峩譁ｰ
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastLoginAt: new Date() },
    })

    // Type assertion: Prisma Client may have old type definitions
    // @ts-ignore - Bypass type checking for username property
    const user: any = session.user
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
 * 繝ｭ繧ｰ繧｢繧ｦ繝・ */
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
 * 逶ｴ霑代Ο繧ｰ繧､繝ｳ縺励◆繝ｦ繝ｼ繧ｶ繝ｼ繧貞叙蠕暦ｼ域怙螟ｧ3蜷搾ｼ・ */
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
 * 繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・譛牙柑諤ｧ繧偵メ繧ｧ繝・け
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞' }
  }

  const trimmed = username.trim()

  if (trimmed.length < 2) {
    return { valid: false, error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・2譁・ｭ嶺ｻ･荳翫〒縺ゅｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・ }
  }

  if (trimmed.length > 20) {
    return { valid: false, error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・20譁・ｭ嶺ｻ･荳九〒縺ゅｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・ }
  }

  // 闍ｱ謨ｰ蟄励→繧｢繝ｳ繝繝ｼ繧ｹ繧ｳ繧｢縲√ワ繧､繝輔Φ縺ｮ縺ｿ險ｱ蜿ｯ
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・闍ｱ謨ｰ蟄励√い繝ｳ繝繝ｼ繧ｹ繧ｳ繧｢(_)縲√ワ繧､繝輔Φ(-)縺ｮ縺ｿ菴ｿ逕ｨ縺ｧ縺阪∪縺・ }
  }

  return { valid: true }
}

