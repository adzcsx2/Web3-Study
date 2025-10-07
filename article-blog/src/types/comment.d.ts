// 评论类型定义
export interface CommentType {
  id?: string; // Supabase UUID
  post_id: string; // 文章ID
  author_id?: string; // 评论者ID（可选，支持匿名评论）
  author_name: string; // 评论者姓名
  author_email?: string; // 评论者邮箱
  author_avatar?: string; // 评论者头像
  content: string; // 评论内容
  parent_id?: string; // 父评论ID（用于回复）
  created_at?: string; // 创建时间
  updated_at?: string; // 更新时间
  is_approved?: boolean; // 是否审核通过
  like_count?: number; // 点赞数
  replies?: CommentType[]; // 子评论
}

// 评论列表请求参数
export interface CommentListReq {
  post_id: string;
  parent_id?: string | null; // null 表示获取顶级评论
  current?: number;
  pageSize?: number;
  sort?: 'created_at' | 'like_count';
  order?: 'asc' | 'desc';
}

// 评论表单类型
export interface CommentFormType {
  post_id: string;
  content: string;
  author_name: string;
  author_email?: string;
  parent_id?: string;
}

// 评论统计类型
export interface CommentStatsType {
  total_count: number;
  approved_count: number;
  pending_count: number;
}