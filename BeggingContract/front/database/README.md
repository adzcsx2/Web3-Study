# 数据库设置指南

这个目录包含了博客系统的完整数据库设置脚本，按执行顺序编号。

## 📁 文件说明

### 1️⃣ `1-schema.sql` - 数据库表结构
创建所有必要的数据表、索引和触发器。

**执行顺序：** 第一

**包含内容：**
- 用户资料表 (user_profiles)
- 分类表 (categories)
- 标签表 (tags)
- 文章表 (posts)
- 评论表 (comments)
- 点赞表 (likes)
- 关注表 (follows)
- 文章标签关联表 (post_tags)
- 所有必要的索引
- 更新时间戳的触发器

### 2️⃣ `2-functions.sql` - 函数和视图
创建数据库函数、触发器和视图。

**执行顺序：** 第二

**包含内容：**
- 自动更新统计数据的函数
- 增加浏览量的函数
- 创建触发器
- 创建视图 (posts_with_author, comments_with_author)

### 3️⃣ `3-rls-policies.sql` - 行级安全策略
设置 RLS (Row Level Security) 策略。

**执行顺序：** 第三

**包含内容：**
- 启用所有表的 RLS
- 用户资料访问策略
- 文章创建/查看/更新/删除策略
- 评论管理策略
- 分类和标签管理策略
- 管理员权限策略

**重要特性：**
- ✅ 任何认证用户都能创建文章
- ✅ 用户只能操作自己的文章
- ✅ 管理员拥有所有权限
- ✅ 公开文章对所有人可见

### 4️⃣ `4-initial-data.sql` - 初始数据
插入一些基础数据。

**执行顺序：** 第四

**包含内容：**
- 默认分类
- 常用标签
- 示例数据（可选）

## 🚀 部署步骤

### 对于全新数据库：

1. **在 Supabase 项目中打开 SQL Editor**
2. **依次执行以下文件：**

   ```bash
   # 第一步：创建表结构
   执行 1-schema.sql 的全部内容

   # 第二步：创建函数和视图
   执行 2-functions.sql 的全部内容

   # 第三步：设置 RLS 策略
   执行 3-rls-policies.sql 的全部内容

   # 第四步：插入初始数据
   执行 4-initial-data.sql 的全部内容
   ```

### 对于现有数据库：

如果数据库中已有部分数据或策略，建议：

1. **备份现有数据**
2. **清理旧策略**（可选）：
   ```sql
   -- 可以先运行 cleanup-rls-complete.sql 来清理旧策略
   ```
3. **按顺序执行脚本**

## ⚠️ 注意事项

### RLS 策略要点：
- 所有表都启用了行级安全
- 用户必须登录才能创建文章
- `author_id` 字段会自动设置为当前用户 ID
- 管理员需要先在 `user_profiles` 表中设置 `role = 'admin'`

### 前端代码要求：
确保 `postService.ts` 中的 `createPost` 方法已经更新为：
```typescript
const { data: { user } } = await supabase.auth.getUser();
// 然后在插入时设置 author_id: user.id
```

### 用户设置：
- 用户首次使用时需要先创建 `user_profiles` 记录
- 可以在用户注册时自动创建默认资料

## 🔧 故障排除

### 常见问题：

1. **权限错误 (permission denied)**
   - 检查用户是否已登录
   - 确认 RLS 策略已正确设置
   - 验证 `user_profiles` 表中是否有用户记录

2. **插入失败 (violates row-level security policy)**
   - 确认 `author_id` 字段已设置
   - 检查 RLS 策略的 `WITH CHECK` 条件
   - 验证用户角色设置

3. **策略冲突**
   - 使用 `cleanup-rls-complete.sql` 清理旧策略
   - 重新执行 `3-rls-policies.sql`

## 📞 支持

如果在部署过程中遇到问题，请检查：
1. 执行顺序是否正确
2. 每个 SQL 文件是否完全执行
3. 是否有错误信息被忽略
4. 用户认证状态是否正常