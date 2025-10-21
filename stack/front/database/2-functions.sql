-- 2. 数据库函数和视图
-- 在 Supabase SQL Editor 中按顺序执行这些脚本
-- 这是第二步：创建所有函数、触发器和视图

-- 2.1 创建函数：自动更新评论统计
CREATE OR REPLACE FUNCTION update_post_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 更新文章评论数
    UPDATE public.posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;

    -- 更新用户评论数
    IF NEW.author_id IS NOT NULL THEN
      UPDATE public.user_profiles
      SET comment_count = comment_count + 1
      WHERE id = NEW.author_id;
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 更新文章评论数
    UPDATE public.posts
    SET comment_count = comment_count - 1
    WHERE id = OLD.post_id;

    -- 更新用户评论数
    IF OLD.author_id IS NOT NULL THEN
      UPDATE public.user_profiles
      SET comment_count = comment_count - 1
      WHERE id = OLD.author_id;
    END IF;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2.2 创建函数：更新点赞统计
CREATE OR REPLACE FUNCTION update_like_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' THEN
      UPDATE public.posts
      SET like_count = like_count + 1
      WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
      UPDATE public.comments
      SET like_count = like_count + 1
      WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      UPDATE public.posts
      SET like_count = like_count - 1
      WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'comment' THEN
      UPDATE public.comments
      SET like_count = like_count - 1
      WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2.3 创建函数：更新关注统计
CREATE OR REPLACE FUNCTION update_follow_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 增加关注者的关注数
    UPDATE public.user_profiles
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;

    -- 增加被关注者的粉丝数
    UPDATE public.user_profiles
    SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 减少关注者的关注数
    UPDATE public.user_profiles
    SET following_count = following_count - 1
    WHERE id = OLD.follower_id;

    -- 减少被关注者的粉丝数
    UPDATE public.user_profiles
    SET follower_count = follower_count - 1
    WHERE id = OLD.following_id;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2.4 创建函数：更新文章发布统计
CREATE OR REPLACE FUNCTION update_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.published = true THEN
      UPDATE public.user_profiles
      SET post_count = post_count + 1
      WHERE id = NEW.author_id;

      -- 更新分类文章数
      IF NEW.category_id IS NOT NULL THEN
        UPDATE public.categories
        SET post_count = post_count + 1
        WHERE id = NEW.category_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 文章从未发布变为发布
    IF OLD.published = false AND NEW.published = true THEN
      UPDATE public.user_profiles
      SET post_count = post_count + 1
      WHERE id = NEW.author_id;
    -- 文章从发布变为未发布
    ELSIF OLD.published = true AND NEW.published = false THEN
      UPDATE public.user_profiles
      SET post_count = post_count - 1
      WHERE id = NEW.author_id;
    END IF;

    -- 分类变更
    IF OLD.category_id != NEW.category_id THEN
      IF OLD.category_id IS NOT NULL AND NEW.published = true THEN
        UPDATE public.categories
        SET post_count = post_count - 1
        WHERE id = OLD.category_id;
      END IF;

      IF NEW.category_id IS NOT NULL AND NEW.published = true THEN
        UPDATE public.categories
        SET post_count = post_count + 1
        WHERE id = NEW.category_id;
      END IF;
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.published = true THEN
      UPDATE public.user_profiles
      SET post_count = post_count - 1
      WHERE id = OLD.author_id;

      -- 更新分类文章数
      IF OLD.category_id IS NOT NULL THEN
        UPDATE public.categories
        SET post_count = post_count - 1
        WHERE id = OLD.category_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2.5 创建函数：更新标签统计
CREATE OR REPLACE FUNCTION update_tag_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 检查文章是否已发布
    IF EXISTS (SELECT 1 FROM public.posts WHERE id = NEW.post_id AND published = true) THEN
      UPDATE public.tags
      SET post_count = post_count + 1
      WHERE id = NEW.tag_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 检查文章是否已发布
    IF EXISTS (SELECT 1 FROM public.posts WHERE id = OLD.post_id AND published = true) THEN
      UPDATE public.tags
      SET post_count = post_count - 1
      WHERE id = OLD.tag_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2.6 创建函数：增加浏览量
CREATE OR REPLACE FUNCTION increment_view_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- 2.7 创建触发器
CREATE TRIGGER trigger_update_post_stats
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_post_stats();

CREATE TRIGGER trigger_update_like_stats
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION update_like_stats();

CREATE TRIGGER trigger_update_follow_stats
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_stats();

CREATE TRIGGER trigger_update_post_count
  AFTER INSERT OR UPDATE OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_post_count();

CREATE TRIGGER trigger_update_tag_stats
  AFTER INSERT OR DELETE ON public.post_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_stats();

-- 2.8 创建视图：带作者信息的文章列表
CREATE OR REPLACE VIEW public.posts_with_author AS
SELECT
  p.*,
  up.username as author_username,
  up.nickname as author_nickname,
  up.avatar_url as author_avatar,
  c.name as category_name,
  c.slug as category_slug
FROM public.posts p
LEFT JOIN public.user_profiles up ON p.author_id = up.id
LEFT JOIN public.categories c ON p.category_id = c.id;

-- 2.9 创建视图：带作者信息的评论列表
CREATE OR REPLACE VIEW public.comments_with_author AS
SELECT
  c.*,
  up.username as author_username,
  up.nickname as author_nickname,
  up.avatar_url as author_avatar
FROM public.comments c
LEFT JOIN public.user_profiles up ON c.author_id = up.id;

-- 函数和视图创建完成
SELECT 'Functions and views created successfully' as status;