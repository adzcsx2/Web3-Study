import { supabase } from "@/lib/supabase";
import { PostType, PostListReq, PostListData } from "@/types/article";
import { format } from "date-fns";

export class PostService {
  // 获取文章列表
  static async getPosts(params: PostListReq): Promise<PostListData> {
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
      current: params.current || 1,
      pageSize: params.pageSize || 10,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / (params.pageSize || 10)),
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
  static async createPost(postData: Partial<PostType>) {
    const slug = this.generateSlug(postData.title!);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        title: postData.title,
        content: postData.content,
        excerpt: postData.excerpt || this.generateExcerpt(postData.content!),
        author_id: user.id,
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
  static async updatePost(id: string, postData: Partial<PostType>) {
    const updateData: Record<string, unknown> = { ...postData };

    if (postData.title) {
      updateData.slug = this.generateSlug(postData.title);
    }

    // 获取原始文章信息，用于判断是否需要设置发布时间
    const { data: existingPost } = await supabase
      .from("posts")
      .select("published")
      .eq("id", id)
      .single();

    if (postData.published && existingPost && !existingPost.published) {
      updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Post not found or unauthorized");
      }
      throw new Error(`Failed to update post: ${error.message}`);
    }

    return data;
  }

  // 删除文章
  static async deletePost(id: string) {
    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Post not found or unauthorized");
      }
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
    const baseSlug = title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
      .substring(0, 80); // 保留空间给时间戳

    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');

    return `${baseSlug}-${timestamp}`;
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
