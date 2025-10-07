import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { CommentListReq } from '@/types/comment'

// GET /api/posts/[id]/comments - 获取文章评论
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: postId } = params
    const { searchParams } = new URL(request.url)

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // 解析查询参数
    const queryParams: CommentListReq = {
      post_id: postId,
      parent_id: searchParams.get('parent_id') || undefined,
      current: parseInt(searchParams.get('current') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      sort: (searchParams.get('sort') as 'created_at' | 'like_count') || 'created_at',
      order: (searchParams.get('order') as 'asc' | 'desc') || 'asc'
    }

    // 构建查询
    let query = supabase
      .from('comments_with_author')
      .select('*')
      .eq('post_id', postId)
      .eq('is_approved', true) // 只显示已审核的评论

    // 如果指定了 parent_id，获取子评论；否则获取顶级评论
    if (queryParams.parent_id === null) {
      query = query.is('parent_id', null)
    } else if (queryParams.parent_id) {
      query = query.eq('parent_id', queryParams.parent_id)
    } else {
      // 不指定 parent_id 时，获取所有评论
      query = query.is('parent_id', null)
    }

    // 添加排序
    const sortField = queryParams.sort || 'created_at'
    const sortOrder = queryParams.order === 'desc'
    query = query.order(sortField, { ascending: !sortOrder })

    // 添加分页
    const from = ((queryParams.current || 1) - 1) * (queryParams.pageSize || 20)
    const to = from + (queryParams.pageSize || 20) - 1
    query = query.range(from, to)

    const { data: comments, error, count } = await query

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    // 如果是获取顶级评论，同时获取回复数量
    const commentsWithReplies = comments || []
    if (!queryParams.parent_id) {
      // 为每个顶级评论获取回复数量
      for (const comment of commentsWithReplies) {
        const { count: replyCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
          .eq('parent_id', comment.id)
          .eq('is_approved', true)

        comment.reply_count = replyCount || 0
      }
    }

    return NextResponse.json({
      data: commentsWithReplies,
      pagination: {
        current: queryParams.current || 1,
        pageSize: queryParams.pageSize || 20,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / (queryParams.pageSize || 20))
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}