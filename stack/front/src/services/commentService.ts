import { supabase } from '@/lib/supabase'
import { CommentListReq, CommentFormType } from '@/types/comment'

export class CommentService {
  // 获取评论列表
  static async getComments(params: CommentListReq) {
    let query = supabase
      .from('comments_with_author')
      .select('*', { count: 'exact' })
      .eq('post_id', params.post_id)
      .eq('is_approved', true)

    // 过滤顶级评论或子评论
    if (params.parent_id === null) {
      query = query.is('parent_id', null)
    } else if (params.parent_id) {
      query = query.eq('parent_id', params.parent_id)
    } else {
      query = query.is('parent_id', null)
    }

    // 排序
    const sortField = params.sort || 'created_at'
    const sortOrder = params.order === 'desc'
    query = query.order(sortField, { ascending: !sortOrder })

    // 分页
    const from = ((params.current || 1) - 1) * (params.pageSize || 20)
    const to = from + (params.pageSize || 20) - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch comments: ${error.message}`)
    }

    // 为顶级评论获取回复数量
    const commentsWithReplies = data || []
    if (!params.parent_id) {
      for (const comment of commentsWithReplies) {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', params.post_id)
          .eq('parent_id', comment.id)
          .eq('is_approved', true)

        // 扩展评论类型以包含回复数
        Object.assign(comment, { reply_count: count || 0 })
      }
    }

    return {
      data: commentsWithReplies,
      pagination: {
        current: params.current || 1,
        pageSize: params.pageSize || 20,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / (params.pageSize || 20))
      }
    }
  }

  // 创建评论
  static async createComment(commentData: CommentFormType, authorId?: string) {
    // 验证文章是否存在且已发布
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, published, author_id')
      .eq('id', commentData.post_id)
      .single()

    if (postError || !post || !post.published) {
      throw new Error('Post not found or not published')
    }

    // 验证父评论
    if (commentData.parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id, post_id')
        .eq('id', commentData.parent_id)
        .single()

      if (parentError || !parentComment || parentComment.post_id !== commentData.post_id) {
        throw new Error('Parent comment not found or invalid')
      }
    }

    // 内容验证
    if (commentData.content.length < 2 || commentData.content.length > 1000) {
      throw new Error('Comment content length must be between 2 and 1000 characters')
    }

    // 简单的内容过滤
    const forbiddenWords = ['spam', 'advertisement']
    const lowerContent = commentData.content.toLowerCase()
    if (forbiddenWords.some(word => lowerContent.includes(word))) {
      throw new Error('Comment contains inappropriate content')
    }

    // 防刷限制
    if (authorId) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
      const { count: recentComments } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', authorId)
        .gte('created_at', oneMinuteAgo)

      if ((recentComments || 0) >= 3) {
        throw new Error('Too many comments in a short time')
      }
    }

    // 创建评论
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: commentData.post_id,
        author_id: authorId || null,
        author_name: commentData.author_name,
        author_email: commentData.author_email,
        content: commentData.content,
        parent_id: commentData.parent_id || null,
        is_approved: true // 可以根据需要改为false，需要审核
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create comment: ${error.message}`)
    }

    return data
  }

  // 更新评论
  static async updateComment(id: string, content: string, authorId: string) {
    const { data, error } = await supabase
      .from('comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('author_id', authorId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update comment: ${error.message}`)
    }

    return data
  }

  // 删除评论
  static async deleteComment(id: string, authorId: string) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)
      .eq('author_id', authorId)

    if (error) {
      throw new Error(`Failed to delete comment: ${error.message}`)
    }

    return true
  }

  // 点赞评论
  static async likeComment(commentId: string, userId: string) {
    // 检查是否已经点赞
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('target_type', 'comment')
      .eq('target_id', commentId)
      .eq('user_id', userId)
      .single()

    if (existingLike) {
      // 取消点赞
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id)

      if (error) {
        throw new Error('Failed to unlike comment')
      }

      return { liked: false }
    } else {
      // 添加点赞
      const { error } = await supabase
        .from('likes')
        .insert({
          target_type: 'comment',
          target_id: commentId,
          user_id: userId
        })

      if (error) {
        throw new Error('Failed to like comment')
      }

      return { liked: true }
    }
  }

  // 审核评论（管理员功能）
  static async approveComment(id: string, approved: boolean) {
    const { data, error } = await supabase
      .from('comments')
      .update({ is_approved: approved })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to ${approved ? 'approve' : 'reject'} comment: ${error.message}`)
    }

    return data
  }
}