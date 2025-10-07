import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { CommentFormType } from '@/types/comment'

// POST /api/comments - 发表评论（需要校验内容、防刷、发通知）
export async function POST(request: NextRequest) {
  try {
    const supabaseServer = createServerClient()
    
    // 验证用户身份
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

    const body: CommentFormType = await request.json()

    // 验证必填字段
    if (!body.post_id || !body.content || !body.author_name) {
      return NextResponse.json(
        { error: 'Post ID, content, and author name are required' },
        { status: 400 }
      )
    }

    // 内容校验
    if (body.content.length < 2) {
      return NextResponse.json(
        { error: 'Comment content is too short' },
        { status: 400 }
      )
    }

    if (body.content.length > 1000) {
      return NextResponse.json(
        { error: 'Comment content is too long (max 1000 characters)' },
        { status: 400 }
      )
    }

    // 简单的内容过滤（可以扩展更复杂的过滤逻辑）
    const forbiddenWords = ['spam', 'advertisement'] // 可以从配置中读取
    const lowerContent = body.content.toLowerCase()
    const hasForbiddenWords = forbiddenWords.some(word => lowerContent.includes(word))
    
    if (hasForbiddenWords) {
      return NextResponse.json(
        { error: 'Comment contains inappropriate content' },
        { status: 400 }
      )
    }

    // 防刷限制：检查用户在过去1分钟内的评论数量
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: recentComments } = await supabaseServer
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id)
      .gte('created_at', oneMinuteAgo)

    if ((recentComments || 0) >= 3) {
      return NextResponse.json(
        { error: 'Too many comments in a short time. Please wait a moment.' },
        { status: 429 }
      )
    }

    // 验证文章是否存在且已发布
    const { data: post, error: postError } = await supabaseServer
      .from('posts')
      .select('id, published, author_id')
      .eq('id', body.post_id)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (!post.published) {
      return NextResponse.json(
        { error: 'Cannot comment on unpublished post' },
        { status: 400 }
      )
    }

    // 如果是回复评论，验证父评论是否存在
    if (body.parent_id) {
      const { data: parentComment, error: parentError } = await supabaseServer
        .from('comments')
        .select('id, post_id')
        .eq('id', body.parent_id)
        .single()

      if (parentError || !parentComment || parentComment.post_id !== body.post_id) {
        return NextResponse.json(
          { error: 'Parent comment not found or does not belong to this post' },
          { status: 400 }
        )
      }
    }

    // 获取用户资料
    const { data: userProfile } = await supabaseServer
      .from('user_profiles')
      .select('username, nickname, avatar_url')
      .eq('id', user.id)
      .single()

    // 创建评论
    const commentData = {
      post_id: body.post_id,
      author_id: user.id,
      author_name: userProfile?.nickname || userProfile?.username || body.author_name,
      author_email: body.author_email || user.email,
      author_avatar: userProfile?.avatar_url,
      content: body.content,
      parent_id: body.parent_id || null,
      is_approved: true // 暂时自动审核通过，可以根据需要改为 false
    }

    const { data: comment, error: commentError } = await supabaseServer
      .from('comments')
      .insert(commentData)
      .select(`
        *,
        user_profiles:author_id(username, nickname, avatar_url)
      `)
      .single()

    if (commentError) {
      console.error('Error creating comment:', commentError)
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    // TODO: 发送通知给文章作者和相关用户
    // await sendCommentNotification(post.author_id, comment)

    return NextResponse.json({ data: comment }, { status: 201 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// TODO: 实现通知功能
// async function sendCommentNotification(postAuthorId: string, comment: any) {
//   // 发送邮件或系统通知
// }