-- 4. 初始数据
-- 在 Supabase SQL Editor 中按顺序执行这些脚本
-- 这是第四步：插入一些初始数据

-- 4.1 插入默认分类
INSERT INTO public.categories (name, description, slug) VALUES
('技术', '技术相关的文章', 'tech'),
('生活', '生活感悟和分享', 'life'),
('学习', '学习笔记和心得', 'learning'),
('随笔', '日常随笔和思考', 'essay'),
('其他', '其他类型的文章', 'other');

-- 4.2 插入常用标签
INSERT INTO public.tags (name, slug) VALUES
('JavaScript', 'javascript'),
('React', 'react'),
('Vue', 'vue'),
('TypeScript', 'typescript'),
('Node.js', 'nodejs'),
('Python', 'python'),
('前端', 'frontend'),
('后端', 'backend'),
('数据库', 'database'),
('算法', 'algorithm'),
('设计', 'design'),
('工具', 'tools'),
('教程', 'tutorial'),
('总结', 'summary'),
('分享', 'sharing');

-- 4.3 创建默认管理员用户资料（需要在有用户注册后手动设置）
-- 注意：这里使用一个临时的 UUID，实际部署时需要替换为真实的用户 ID
-- INSERT INTO public.user_profiles (id, username, nickname, role) VALUES
-- ('00000000-0000-0000-0000-000000000000', 'admin', '系统管理员', 'admin');

-- 4.4 创建一个示例文章（可选，需要在有用户后创建）
-- INSERT INTO public.posts (
--   title, content, excerpt, author_id, published, slug
-- ) VALUES
-- (
--   '欢迎使用博客系统',
--   '# 欢迎使用博客系统\n\n这是您的第一篇博客文章。\n\n## 功能特点\n\n- 支持 Markdown\n- 分类管理\n- 标签系统\n- 评论功能\n\n祝您使用愉快！',
--   '欢迎使用博客系统，开始您的创作之旅。',
--   '00000000-0000-0000-0000-000000000000',
--   true,
--   'welcome-to-blog'
-- );

-- 4.5 查看插入的数据
SELECT 'Categories created:' as info;
SELECT id, name, slug FROM public.categories ORDER BY name;

SELECT '';
SELECT 'Tags created:' as info;
SELECT id, name, slug FROM public.tags ORDER BY name;

-- 初始数据创建完成
SELECT 'Initial data inserted successfully' as status;