import { NextRequest, NextResponse } from 'next/server'
import { signIn, validateUsername } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username } = body

    // ユーザー名の検証
    const validation = validateUsername(username)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // ログイン処理
    const result = await signIn(username.trim())

    if (!result) {
      return NextResponse.json(
        { error: 'ログインに失敗しました' },
        { status: 500 }
      )
    }

    // セッションクッキーを設定
    const cookieStore = await cookies()
    cookieStore.set('session_token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30日
      path: '/',
    })

    return NextResponse.json({
      success: true,
      user: result.user,
    })
  } catch (error: any) {
    console.error('[AUTH API] Sign in error:', error)
    return NextResponse.json(
      { error: error?.message || 'ログインに失敗しました' },
      { status: 500 }
    )
  }
}

