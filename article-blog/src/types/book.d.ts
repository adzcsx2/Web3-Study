// 文章类型定义
export interface PostType {
  id?: string; // Supabase UUID
  title: string; // 文章标题
  content: string; // 文章内容（支持 Markdown）
  excerpt?: string; // 文章摘要
  author_id?: string; // 作者ID
  author_name?: string; // 作者名称
  published: boolean; // 是否发布
  created_at?: string; // 创建时间
  updated_at?: string; // 更新时间
  published_at?: string; // 发布时间
  cover_image?: string; // 封面图片
  category_id?: string; // 分类ID
  category_name?: string; // 分类名称
  tags?: string[]; // 标签数组
  view_count?: number; // 阅读次数
  like_count?: number; // 点赞次数
  comment_count?: number; // 评论次数
}

// 文章列表请求参数
export interface PostListReq {
  author?: string;
  current?: number;
  title?: string;
  pageSize?: number;
  category?: string;
  tags?: string;
  published?: boolean;
  sort?: 'created_at' | 'updated_at' | 'view_count' | 'like_count';
  order?: 'asc' | 'desc';
}

// 文章表单类型
export interface PostFormType {
  title: string;
  editData?: PostType;
}

// 分类类型
export interface CategoryType {
  id?: string;
  name: string;
  description?: string;
  slug: string; // URL友好的标识符
  created_at?: string;
  post_count?: number; // 该分类下的文章数量
}

// 标签类型
export interface TagType {
  id?: string;
  name: string;
  slug: string;
  created_at?: string;
  post_count?: number; // 该标签下的文章数量
}
