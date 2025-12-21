/**
 *  * 路由路径常量定义
 */

export const Path = {
  // 公共路径
  LOGIN: "/login",
  REGISTER: "/login/register",

  //首页-交易
  HOME: "/",

  // 添加流动性
  ADD_LIQUIDITY: "/liquidity/add",
  REMOVE_LIQUIDITY: "/liquidity/remove",
  PLEDGE_LIQUIDITY: "/liquidity/pledge",

  // 文章相关路由
  POSTS: "/posts",
  POST_DETAIL: (id: string) => `/posts/${id}`,
  POST_CREATE: "/posts/create",
  POST_EDIT: (id: string) => `/posts/${id}/edit`,

  // 管理后台路由
  ADMIN: "/admin",
  ADMIN_POSTS: "/admin/posts",
  ADMIN_POST_CREATE: "/admin/posts/create",
  ADMIN_POST_EDIT: (id: string) => `/admin/posts/${id}/edit`,
  ADMIN_COMMENTS: "/admin/comments",
  ADMIN_CATEGORIES: "/admin/categories",
  ADMIN_TAGS: "/admin/tags",
  ADMIN_USERS: "/admin/users",

  // 用户相关路由
  PROFILE: (username: string) => `/profile/${username}`,
  PROFILE_EDIT: "/profile/edit",
  MY_POSTS: "/my/posts",
  MY_DRAFTS: "/my/drafts",

  // 分类和标签路由
  CATEGORIES: "/categories",
  CATEGORY_POSTS: (slug: string) => `/categories/${slug}`,
  TAGS: "/tags",
  TAG_POSTS: (slug: string) => `/tags/${slug}`,

  // 作者相关路由
  AUTHORS: "/authors",
  AUTHOR_POSTS: (username: string) => `/authors/${username}`,

  // 搜索和归档路由
  SEARCH: "/search",
  ARCHIVE: "/archive",
} as const;

// 辅助函数：生成带参数的动态路由
export const PathHelper = {
  // 生成文章详情路径
  getPostDetail: (id: string) => `/posts/${id}`,

  // 生成文章编辑路径
  getPostEdit: (id: string) => `/posts/${id}/edit`,

  // 生成用户资料路径
  getProfile: (username: string) => `/profile/${username}`,

  // 生成分类文章路径
  getCategoryPosts: (slug: string) => `/categories/${slug}`,

  // 生成标签文章路径
  getTagPosts: (slug: string) => `/tags/${slug}`,

  // 生成作者文章路径
  getAuthorPosts: (username: string) => `/authors/${username}`,

  // 生成搜索路径
  getSearchUrl: (query: string) => `/search?q=${encodeURIComponent(query)}`,
} as const;
