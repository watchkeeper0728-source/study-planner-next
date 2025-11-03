import { prisma } from './prisma'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'

// 郢ｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ隴帷甥譟題ｭ帶ｻ・応繝ｻ繝ｻ0隴鯉ｽ･繝ｻ繝ｻconst SESSION_EXPIRES_DAYS = 30

export interface SessionUser {
  id: string
  username: string
  name: string | null
}

/**
 * 郢ｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ郢ｧ雋槫徐陟輔・ */
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
      // 郢ｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ邵ｺ謔滂ｽｭ莨懈Β邵ｺ蜉ｱ竊醍ｸｺ繝ｻﾂ竏壺穐邵ｺ貅倥・隴帶ｻ・応陋ｻ繝ｻ・・      if (session) {
        // 隴帶ｻ・応陋ｻ繝ｻ・檎ｹｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ郢ｧ雋樒ｎ鬮ｯ・､
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
 * 郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ陷ｷ髦ｪ縲堤ｹ晢ｽｭ郢ｧ・ｰ郢ｧ・､郢晢ｽｳ
 */
export async function signIn(username: string): Promise<{ user: SessionUser; sessionToken: string } | null> {
  try {
    // 郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ郢ｧ蜻茨ｽ､諛・ｽｴ・｢邵ｺ・ｾ邵ｺ貅倥・闖ｴ諛医・
    let user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      // 隴・ｽｰ髫穂ｸ莞倡ｹ晢ｽｼ郢ｧ・ｶ郢晢ｽｼ郢ｧ蜑・ｽｽ諛医・
      user = await prisma.user.create({
        data: {
          username,
          name: username,
        },
      })
    } else {
      // 隴鯉ｽ｢陝・･ﾎ倡ｹ晢ｽｼ郢ｧ・ｶ郢晢ｽｼ邵ｺ・ｮ隴崢驍ｨ繧・溽ｹｧ・ｰ郢ｧ・､郢晢ｽｳ隴弱ｇ邯ｾ郢ｧ蜻亥ｳｩ隴・ｽｰ
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
    }

    // 郢ｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ郢晏現繝ｻ郢ｧ・ｯ郢晢ｽｳ郢ｧ蝣､蜃ｽ隰後・    const sessionToken = nanoid(32)

    // 郢ｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ郢ｧ蜑・ｽｽ諛医・
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
 * 郢ｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ郢晏現繝ｻ郢ｧ・ｯ郢晢ｽｳ邵ｺ・ｧ郢晢ｽｭ郢ｧ・ｰ郢ｧ・､郢晢ｽｳ繝ｻ閧ｲ蟲ｩ髴台ｻ｣ﾎ溽ｹｧ・ｰ郢ｧ・､郢晢ｽｳ郢晄㈱縺｡郢晢ｽｳ騾包ｽｨ繝ｻ繝ｻ */
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

    // 隴崢驍ｨ繧・溽ｹｧ・ｰ郢ｧ・､郢晢ｽｳ隴弱ｇ邯ｾ郢ｧ蜻亥ｳｩ隴・ｽｰ
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
 * 郢晢ｽｭ郢ｧ・ｰ郢ｧ・｢郢ｧ・ｦ郢昴・ */
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
 * 騾ｶ・ｴ髴台ｻ｣ﾎ溽ｹｧ・ｰ郢ｧ・､郢晢ｽｳ邵ｺ蜉ｱ笳・ｹ晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ郢ｧ雋槫徐陟墓圜・ｼ蝓滓呵棔・ｧ3陷ｷ謳ｾ・ｼ繝ｻ */
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
 * 郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ陷ｷ髦ｪ繝ｻ隴帷甥譟題ｫ､・ｧ郢ｧ蛛ｵ繝｡郢ｧ・ｧ郢昴・縺・ */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: '郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ陷ｷ髦ｪ・定怦・･陷牙ｸ呻ｼ邵ｺ・ｦ邵ｺ荳岩味邵ｺ霈費ｼ・ }
  }

  const trimmed = username.trim()

  if (trimmed.length < 2) {
    return { valid: false, error: '郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ陷ｷ髦ｪ繝ｻ2隴√・・ｭ蠍ｺ・ｻ・･闕ｳ鄙ｫ縲堤ｸｺ繧・ｽ玖｢繝ｻ・ｦ竏壺ｲ邵ｺ繧・ｽ顔ｸｺ・ｾ邵ｺ繝ｻ }
  }

  if (trimmed.length > 20) {
    return { valid: false, error: '郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ陷ｷ髦ｪ繝ｻ20隴√・・ｭ蠍ｺ・ｻ・･闕ｳ荵昴堤ｸｺ繧・ｽ玖｢繝ｻ・ｦ竏壺ｲ邵ｺ繧・ｽ顔ｸｺ・ｾ邵ｺ繝ｻ }
  }

  // 髣搾ｽｱ隰ｨ・ｰ陝・干竊堤ｹｧ・｢郢晢ｽｳ郢敖郢晢ｽｼ郢ｧ・ｹ郢ｧ・ｳ郢ｧ・｢邵ｲ竏壹Ρ郢ｧ・､郢晁ｼ釆ｦ邵ｺ・ｮ邵ｺ・ｿ髫ｪ・ｱ陷ｿ・ｯ
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: '郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ陷ｷ髦ｪ繝ｻ髣搾ｽｱ隰ｨ・ｰ陝・干ﾂ竏壹＞郢晢ｽｳ郢敖郢晢ｽｼ郢ｧ・ｹ郢ｧ・ｳ郢ｧ・｢(_)邵ｲ竏壹Ρ郢ｧ・､郢晁ｼ釆ｦ(-)邵ｺ・ｮ邵ｺ・ｿ闖ｴ・ｿ騾包ｽｨ邵ｺ・ｧ邵ｺ髦ｪ竏ｪ邵ｺ繝ｻ }
  }

  return { valid: true }
}