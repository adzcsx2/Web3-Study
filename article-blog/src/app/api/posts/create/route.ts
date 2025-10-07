import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { PostType } from "@/types/article";

// POST /api/posts - 发布文章（需要认证）
export async function POST(request: NextRequest) {
  try {
    const supabaseServer = createServerClient();

    // 验证用户身份
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header is required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 检查用户权限
    const { data: userProfile, error: profileError } = await supabaseServer
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      !["admin", "author"].includes(userProfile.role)
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body: Partial<PostType> = await request.json();

    // 验证必填字段
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // 生成 slug
    const slug = generateSlug(body.title);

    // 创建文章
    const postData = {
      title: body.title,
      content: body.content,
      excerpt: body.excerpt || generateExcerpt(body.content),
      author_id: user.id,
      published: body.published || false,
      cover_image: body.cover_image,
      category_id: body.category_id,
      slug,
      published_at: body.published ? new Date().toISOString() : null,
    };

    const { data: post, error: postError } = await supabaseServer
      .from("posts")
      .insert(postData)
      .select()
      .single();

    if (postError) {
      console.error("Error creating post:", postError);
      return NextResponse.json(
        { error: "Failed to create post" },
        { status: 500 }
      );
    }

    // 处理标签
    if (body.tags && body.tags.length > 0) {
      await handlePostTags(supabaseServer, post.id, body.tags);
    }

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 生成 URL 友好的 slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "") // 保留中文字符
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 100); // 限制长度
}

// 生成文章摘要
function generateExcerpt(content: string, maxLength: number = 200): string {
  // 去除 Markdown 语法
  const plainText = content
    .replace(/```[\s\S]*?```/g, "") // 代码块
    .replace(/`([^`]+)`/g, "$1") // 行内代码
    .replace(/!\[.*?\]\(.*?\)/g, "") // 图片
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 链接
    .replace(/[#*_~`]/g, "") // Markdown 标记
    .replace(/\n+/g, " ") // 换行
    .trim();

  return plainText.length > maxLength
    ? plainText.substring(0, maxLength) + "..."
    : plainText;
}

// 处理文章标签
async function handlePostTags(
  supabase: ReturnType<typeof createServerClient>,
  postId: string,
  tags: string[]
) {
  // 获取或创建标签
  const tagIds: string[] = [];
  for (const tagName of tags) {
    const slug = generateSlug(tagName);

    // 尝试获取现有标签
    let tag: { id: string } | null = null;
    const { data: existingTag, error } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .single();

    if (error && error.code === "PGRST116") {
      // 标签不存在，创建新标签
      const { data: newTag, error: createError } = await supabase
        .from("tags")
        .insert({ name: tagName, slug })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating tag:", createError);
        continue;
      }
      tag = newTag;
    } else {
      tag = existingTag;
    }

    if (tag) {
      tagIds.push(tag.id);
    }
  }

  // 创建文章标签关联
  if (tagIds.length > 0) {
    const postTags = tagIds.map((tagId) => ({
      post_id: postId,
      tag_id: tagId,
    }));

    const { error } = await supabase.from("post_tags").insert(postTags);

    if (error) {
      console.error("Error creating post tags:", error);
    }
  }
}
