import { NextResponse } from 'next/server'
import { getRecentUsers } from '@/lib/auth'

export async function GET() {
  try {
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

