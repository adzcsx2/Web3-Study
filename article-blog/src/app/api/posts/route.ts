import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PostListReq } from "@/types/article";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 解析查询参数
    const sortParam = searchParams.get("sort") as
      | "created_at"
      | "updated_at"
      | "view_count"
      | "like_count"
      | null;
    const orderParam = searchParams.get("order") as "asc" | "desc" | null;

    const params: PostListReq = {
      current: parseInt(searchParams.get("current") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "10"),
      title: searchParams.get("title") || undefined,
      author: searchParams.get("author") || undefined,
      category: searchParams.get("category") || undefined,
      tags: searchParams.get("tags") || undefined,
      published: searchParams.get("published") === "true",
      sort: sortParam || "created_at",
      order: orderParam || "desc",
    };

    // 构建查询
    let query = supabase.from("posts_with_author").select(`
        *,
        post_tags!inner(
          tags(name, slug)
        )
      `);

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
    const sortOrder = params.order === "asc" ? true : false;
    query = query.order(sortField, { ascending: sortOrder });

    // 添加分页
    const from = ((params.current || 1) - 1) * (params.pageSize || 10);
    const to = from + (params.pageSize || 10) - 1;
    query = query.range(from, to);

    const { data: posts, error, count } = await query;

    if (error) {
      console.error("Error fetching posts:", error);
      return NextResponse.json(
        { error: "Failed to fetch posts" },
        { status: 500 }
      );
    }

    // 处理标签数据
    const processedPosts =
      posts?.map((post) => ({
        ...post,
        tags:
          (
            post as {
              post_tags?: Array<{ tags: { name: string; slug: string } }>;
            }
          ).post_tags?.map((pt) => pt.tags) || [],
      })) || [];

    return NextResponse.json({
      data: processedPosts,
      pagination: {
        current: params.current || 1,
        pageSize: params.pageSize || 10,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / (params.pageSize || 10)),
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
