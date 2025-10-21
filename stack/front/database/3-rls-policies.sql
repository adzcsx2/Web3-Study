-- 3. RLS (Row Level Security) 策略配置
-- 在 Supabase SQL Editor 中按顺序执行这些脚本
-- 这是第三步：设置行级安全策略

-- 3.1 启用所有表的 RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- 3.2 用户资料策略
-- 任何人都可以查看已激活用户的公开资料
CREATE POLICY "Public user profiles are viewable by everyone" ON public.user_profiles
  FOR SELECT USING (status = 'active');

-- 用户只能更新自己的资料
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- 用户可以插入自己的资料
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3.3 分类策略
-- 所有人都可以查看分类
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (true);

-- 管理员可以创建分类
CREATE POLICY "Admins can create categories" ON public.categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 管理员可以修改和删除分类
CREATE POLICY "Admins can modify categories" ON public.categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete categories" ON public.categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3.4 标签策略
-- 所有人都可以查看标签
CREATE POLICY "Tags are viewable by everyone" ON public.tags
  FOR SELECT USING (true);

-- 已认证用户可以创建标签
CREATE POLICY "Authenticated users can create tags" ON public.tags
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3.5 文章策略 - 最重要的一组策略
-- 所有人都可以查看已发布的文章
CREATE POLICY "Published posts are viewable by everyone" ON public.posts
  FOR SELECT USING (published = true);

-- 用户可以查看自己的所有文章（包括未发布的）
CREATE POLICY "Users can view own posts" ON public.posts
  FOR SELECT USING (auth.uid() = author_id);

-- 管理员可以查看所有文章
CREATE POLICY "Admins can view all posts" ON public.posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 任何认证用户都可以创建文章（关键是这里）
CREATE POLICY "Authenticated users can create posts" ON public.posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    auth.role() = 'authenticated'
  );

-- 用户可以更新自己的文章
CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = author_id);

-- 管理员可以更新所有文章
CREATE POLICY "Admins can update all posts" ON public.posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 用户可以删除自己的文章
CREATE POLICY "Users can delete own posts" ON public.posts
  FOR DELETE USING (auth.uid() = author_id);

-- 管理员可以删除所有文章
CREATE POLICY "Admins can delete all posts" ON public.posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3.6 文章标签关联策略
-- 所有人都可以查看文章标签关联
CREATE POLICY "Post tags are viewable by everyone" ON public.post_tags
  FOR SELECT USING (true);

-- 文章作者可以管理自己文章的标签
CREATE POLICY "Post authors can manage post tags" ON public.post_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

-- 3.7 评论策略
-- 所有人都可以查看已审核的评论
CREATE POLICY "Approved comments are viewable by everyone" ON public.comments
  FOR SELECT USING (is_approved = true);

-- 评论作者可以查看自己的评论
CREATE POLICY "Comment authors can view own comments" ON public.comments
  FOR SELECT USING (auth.uid() = author_id);

-- 管理员可以查看所有评论
CREATE POLICY "Admins can view all comments" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 已认证用户可以发表评论
CREATE POLICY "Authenticated users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 评论作者可以更新自己的评论
CREATE POLICY "Comment authors can update own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = author_id);

-- 管理员可以更新所有评论
CREATE POLICY "Admins can update all comments" ON public.comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 评论作者可以删除自己的评论
CREATE POLICY "Comment authors can delete own comments" ON public.comments
  FOR DELETE USING (auth.uid() = author_id);

-- 管理员可以删除所有评论
CREATE POLICY "Admins can delete all comments" ON public.comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3.8 点赞策略
-- 用户可以查看所有点赞记录
CREATE POLICY "Likes are viewable by everyone" ON public.likes
  FOR SELECT USING (true);

-- 已认证用户可以点赞
CREATE POLICY "Authenticated users can create likes" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能删除自己的点赞
CREATE POLICY "Users can delete own likes" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- 3.9 关注策略
-- 用户可以查看关注关系
CREATE POLICY "Follows are viewable by everyone" ON public.follows
  FOR SELECT USING (true);

-- 用户可以关注他人
CREATE POLICY "Users can create follows" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- 用户只能取消自己的关注
CREATE POLICY "Users can delete own follows" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- RLS 策略创建完成
SELECT 'RLS policies created successfully' as status;

-- 3.10 验证策略创建情况
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('posts', 'user_profiles', 'categories', 'tags', 'comments', 'likes', 'follows', 'post_tags')
ORDER BY tablename, cmd, policyname;