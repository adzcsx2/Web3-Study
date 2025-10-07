import { supabase } from "@/lib/supabase";
import { PostType, PostListReq } from "@/types/article";

export class PostService {
  // 获取文章列表
  static async getPosts(params: PostListReq) {
    let query = supabase.from("posts_with_author").select(
      `
        *,
        post_tags(
          tags(name, slug)
        )
      `,
      { count: "exact" }
    );

    // 添加过滤条件
    if (params.published !== undefined) {
      query = query.eq("published", params.published);
    }

    if (params.title) {
      query = query.ilike("title", `%${params.title}%`);
    }

    if (params.author) {
      query = query.or(
        `author_username.ilike.%${params.author}%,author_nickname.ilike.%${params.author}%`
      );
    }

    if (params.category) {
      query = query.eq("category_slug", params.category);
    }

    // 添加排序
    const sortField = params.sort || "created_at";
    const sortOrder = params.order === "asc";
    query = query.order(sortField, { ascending: sortOrder });

    // 添加分页
    const from = ((params.current || 1) - 1) * (params.pageSize || 10);
    const to = from + (params.pageSize || 10) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }

    // 处理标签数据
    interface PostWithTags extends Record<string, unknown> {
      post_tags?: Array<{ tags: { name: string; slug: string } }>;
    }

    const processedData =
      data?.map((post) => ({
        ...post,
        tags: (post as PostWithTags).post_tags?.map((pt) => pt.tags) || [],
      })) || [];

    return {
      data: processedData,
      pagination: {
        current: params.current || 1,
        pageSize: params.pageSize || 10,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / (params.pageSize || 10)),
      },
    };
  }

  // 获取文章详情
  static async getPostById(id: string) {
    const { data, error } = await supabase
      .from("posts_with_author")
      .select(
        `
        *,
        post_tags(
          tags(id, name, slug)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Post not found");
      }
      throw new Error(`Failed to fetch post: ${error.message}`);
    }

    // 处理标签数据
    interface PostDetailWithTags extends Record<string, unknown> {
      post_tags?: Array<{ tags: { id: string; name: string; slug: string } }>;
    }

    const processedPost = {
      ...data,
      tags: (data as PostDetailWithTags).post_tags?.map((pt) => pt.tags) || [],
    };

    return processedPost;
  }

  // 创建文章
  static async createPost(postData: Partial<PostType>, authorId: string) {
    const slug = this.generateSlug(postData.title!);

    const { data, error } = await supabase
      .from("posts")
      .insert({
        title: postData.title,
        content: postData.content,
        excerpt: postData.excerpt || this.generateExcerpt(postData.content!),
        author_id: authorId,
        published: postData.published || false,
        cover_image: postData.cover_image,
        category_id: postData.category_id,
        slug,
        published_at: postData.published ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }

    return data;
  }

  // 更新文章
  static async updatePost(
    id: string,
    postData: Partial<PostType>,
    authorId: string
  ) {
    // 验证作者权限
    const { data: existingPost } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", id)
      .single();

    if (!existingPost || existingPost.author_id !== authorId) {
      throw new Error("Unauthorized to update this post");
    }

    const updateData: Record<string, unknown> = { ...postData };

    if (postData.title) {
      updateData.slug = this.generateSlug(postData.title);
    }

    if (postData.published && !existingPost) {
      updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }

    return data;
  }

  // 删除文章
  static async deletePost(id: string, authorId: string) {
    // 验证作者权限
    const { data: existingPost } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", id)
      .single();

    if (!existingPost || existingPost.author_id !== authorId) {
      throw new Error("Unauthorized to delete this post");
    }

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }

    return true;
  }

  // 增加访问量
  static async incrementViewCount(id: string) {
    const { error } = await supabase.rpc("increment_view_count", {
      post_id: id,
    });

    if (error) {
      console.error("Failed to increment view count:", error);
    }
  }

  // 生成 URL 友好的 slug
  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
      .substring(0, 100);
  }

  // 生成文章摘要
  private static generateExcerpt(
    content: string,
    maxLength: number = 200
  ): string {
    const plainText = content
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*_~`]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    return plainText.length > maxLength
      ? plainText.substring(0, maxLength) + "..."
      : plainText;
  }
}
