import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // 获取文章详情
    const { data: post, error } = await supabase
      .from('posts_with_author')
      .select(`
        *,
        post_tags(
          tags(id, name, slug)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching post:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch post' },
        { status: 500 }
      )
    }

    // 处理标签数据
    const processedPost = {
      ...post,
      tags: (post as { post_tags?: Array<{ tags: { id: string; name: string; slug: string } }> }).post_tags?.map(pt => pt.tags) || []
    }

    // 增加访问量（异步执行，不影响响应）
    supabase
      .from('posts')
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Error updating view count:', error)
        }
      })

    return NextResponse.json({ data: processedPost })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}