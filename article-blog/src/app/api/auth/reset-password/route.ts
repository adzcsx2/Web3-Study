import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// POST /api/auth/reset-password - 重置密码
export async function POST(request: NextRequest) {
  try {
    const supabaseServer = createServerClient()
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // 发送重置密码邮件
    const { error } = await supabaseServer.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
    })

    if (error) {
      console.error('Reset password error:', error)
      
      // 不暴露具体错误信息，统一返回成功消息
      // 这样可以防止邮箱枚举攻击
    }

    return NextResponse.json({
      message: 'If the email exists in our system, you will receive a password reset link.'
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}