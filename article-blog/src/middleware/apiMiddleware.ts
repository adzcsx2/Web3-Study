import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { USER_ROLE } from '@/types/user'

export interface AuthContext {
  user: {
    id: string
    email: string
    role: USER_ROLE
  } | null
  session: {
    user: {
      id: string
      email: string
    }
    token: string
  } | null
}

// 认证中间件 - 验证用户是否已登录
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const supabaseServer = createServerClient()
    
    // 从请求头获取token
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // 获取用户角色
    const { data: userProfile } = await supabaseServer
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const context: AuthContext = {
      user: {
        id: user.id,
        email: user.email!,
        role: userProfile?.role || USER_ROLE.READER
      },
      session: { 
        user: {
          id: user.id,
          email: user.email!
        }, 
        token 
      }
    }

    return await handler(request, context)

  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

// 权限中间件 - 验证用户是否有足够的权限
export function withRole(requiredRole: USER_ROLE) {
  return async function(
    request: NextRequest,
    handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (req, context) => {
      if (!context.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const roleHierarchy = {
        [USER_ROLE.ADMIN]: 3,
        [USER_ROLE.AUTHOR]: 2,
        [USER_ROLE.READER]: 1
      }

      const userRoleLevel = roleHierarchy[context.user.role]
      const requiredRoleLevel = roleHierarchy[requiredRole]

      if (userRoleLevel < requiredRoleLevel) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      return await handler(req, context)
    })
  }
}

// 管理员权限中间件
export const withAdmin = withRole(USER_ROLE.ADMIN)

// 作者权限中间件  
export const withAuthor = withRole(USER_ROLE.AUTHOR)

// 速率限制中间件
export function withRateLimit(options: {
  maxRequests: number
  windowMs: number
  keyGenerator?: (request: NextRequest) => string
}) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>()

  return async function(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = options.keyGenerator 
      ? options.keyGenerator(request)
      : request.headers.get('x-forwarded-for') || 'anonymous'

    const now = Date.now()
    const windowStart = now - options.windowMs

    // 清理过期的记录
    for (const [k, v] of requestCounts.entries()) {
      if (v.resetTime < windowStart) {
        requestCounts.delete(k)
      }
    }

    const current = requestCounts.get(key)
    
    if (!current) {
      requestCounts.set(key, { count: 1, resetTime: now + options.windowMs })
    } else if (current.count >= options.maxRequests) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        },
        { status: 429 }
      )
    } else {
      current.count++
    }

    return await handler(request)
  }
}

// 内容验证中间件
export function withContentValidation(options: {
  maxLength?: number
  minLength?: number
  forbiddenWords?: string[]
  required?: boolean
}) {
  return async function(
    request: NextRequest,
    handler: (request: NextRequest, validatedContent?: Record<string, unknown>) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      const body = await request.json()
      
      if (options.required && !body.content) {
        return NextResponse.json(
          { error: 'Content is required' },
          { status: 400 }
        )
      }

      if (body.content) {
        const content = body.content.toString()

        // 长度验证
        if (options.minLength && content.length < options.minLength) {
          return NextResponse.json(
            { error: `Content must be at least ${options.minLength} characters` },
            { status: 400 }
          )
        }

        if (options.maxLength && content.length > options.maxLength) {
          return NextResponse.json(
            { error: `Content must not exceed ${options.maxLength} characters` },
            { status: 400 }
          )
        }

        // 内容过滤
        if (options.forbiddenWords && options.forbiddenWords.length > 0) {
          const lowerContent = content.toLowerCase()
          const foundForbidden = options.forbiddenWords.find(word => 
            lowerContent.includes(word.toLowerCase())
          )

          if (foundForbidden) {
            return NextResponse.json(
              { error: 'Content contains inappropriate words' },
              { status: 400 }
            )
          }
        }
      }

      return await handler(request, body)

    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
  }
}

// CORS中间件
export function withCors(options: {
  origin?: string[]
  methods?: string[]
  headers?: string[]
} = {}) {
  const defaultOptions = {
    origin: ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization']
  }

  const config = { ...defaultOptions, ...options }

  return async function(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': config.origin.join(', '),
          'Access-Control-Allow-Methods': config.methods.join(', '),
          'Access-Control-Allow-Headers': config.headers.join(', ')
        }
      })
    }

    const response = await handler(request)

    // 添加CORS头
    response.headers.set('Access-Control-Allow-Origin', config.origin.join(', '))
    response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '))
    response.headers.set('Access-Control-Allow-Headers', config.headers.join(', '))

    return response
  }
}