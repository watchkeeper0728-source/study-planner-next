import { prisma } from './prisma'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'

// セッション有効期限（30日）
const SESSION_EXPIRES_DAYS = 30

export interface SessionUser {
  id: string
  username: string
  name: string | null
}

/**
 * セッションを取得
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
      include: { user: true },
    })

    if (!session || session.expires < new Date()) {
      // セッションが存在しない、または期限切れ
      if (session) {
        // 期限切れセッションを削除
        await prisma.session.delete({ where: { id: session.id } })
      }
      return null
    }

    return {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
    }
  } catch (error) {
    console.error('[AUTH] Error getting session:', error)
    return null
  }
}

/**
 * ユーザー名でログイン
 */
export async function signIn(username: string): Promise<{ user: SessionUser; sessionToken: string } | null> {
  try {
    // ユーザーを検索または作成
    let user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      // 新規ユーザーを作成
      user = await prisma.user.create({
        data: {
          username,
          name: username,
        },
      })
    } else {
      // 既存ユーザーの最終ログイン時刻を更新
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
    }

    // セッショントークンを生成
    const sessionToken = nanoid(32)

    // セッションを作成
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
 * セッショントークンでログイン（直近ログインボタン用）
 */
export async function signInWithToken(sessionToken: string): Promise<SessionUser | null> {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    })

    if (!session || session.expires < new Date()) {
      return null
    }

    // 最終ログイン時刻を更新
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastLoginAt: new Date() },
    })

    return {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
    }
  } catch (error) {
    console.error('[AUTH] Error signing in with token:', error)
    return null
  }
}

/**
 * ログアウト
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
 * 直近ログインしたユーザーを取得（最大3名）
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
 * ユーザー名の有効性をチェック
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'ユーザー名を入力してください' }
  }

  const trimmed = username.trim()

  if (trimmed.length < 2) {
    return { valid: false, error: 'ユーザー名は2文字以上である必要があります' }
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'ユーザー名は20文字以下である必要があります' }
  }

  // 英数字とアンダースコア、ハイフンのみ許可
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'ユーザー名は英数字、アンダースコア(_)、ハイフン(-)のみ使用できます' }
  }

  return { valid: true }
}
