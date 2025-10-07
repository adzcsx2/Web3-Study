// 用户角色枚举
export enum USER_ROLE {
  ADMIN = 'admin',
  AUTHOR = 'author',
  READER = 'reader'
}

// 用户状态枚举
export enum USER_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned'
}

// 博客用户类型定义
export interface User {
  id?: string; // Supabase UUID
  email: string; // 邮箱（Supabase Auth）
  name?: string; // 真实姓名
  username?: string; // 用户名
  nickname?: string; // 昵称
  avatar_url?: string; // 头像URL
  bio?: string; // 个人简介
  website?: string; // 个人网站
  role: USER_ROLE; // 用户角色
  status: USER_STATUS; // 用户状态
  created_at?: string; // 注册时间
  updated_at?: string; // 更新时间
  last_sign_in_at?: string; // 最后登录时间
  post_count?: number; // 发布文章数
  comment_count?: number; // 评论数
  follower_count?: number; // 粉丝数
  following_count?: number; // 关注数
}

// 用户查询参数
export interface UserQueryType {
  current?: number;
  pageSize?: number;
  name?: string;
  username?: string;
  email?: string;
  role?: USER_ROLE;
  status?: USER_STATUS;
  all?: boolean;
}

// 用户表单属性
export interface UserFormProps {
  title: string;
  editData?: User;
}

// 用户资料更新类型
export interface UserProfileUpdate {
  name?: string;
  username?: string;
  nickname?: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
}

// 认证状态类型
export interface AuthState {
  user: User | null;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: {
      id: string;
      email: string;
      [key: string]: unknown;
    };
  } | null;
  loading: boolean;
  error: string | null;
}
