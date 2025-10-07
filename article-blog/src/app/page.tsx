
import { Button, Card, Typography } from 'antd'
import Link from 'next/link'
import { Path } from '@/router/path'

const { Title, Paragraph } = Typography

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Title level={1} className="text-5xl font-bold text-gray-800 mb-4">
            欢迎来到我的博客
          </Title>
          <Paragraph className="text-xl text-gray-600 max-w-2xl mx-auto">
            这里记录着我的思考、学习和创作。探索技术、分享经验、传递知识。
          </Paragraph>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card 
            className="text-center hover:shadow-lg transition-shadow"
            cover={
              <div className="h-32 bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                <span className="text-4xl">📝</span>
              </div>
            }
          >
            <Title level={3}>最新文章</Title>
            <Paragraph>发现最新的技术文章和思考</Paragraph>
            <Link href={Path.POSTS}>
              <Button type="primary">查看文章</Button>
            </Link>
          </Card>

          <Card 
            className="text-center hover:shadow-lg transition-shadow"
            cover={
              <div className="h-32 bg-gradient-to-r from-green-400 to-blue-400 flex items-center justify-center">
                <span className="text-4xl">🏷️</span>
              </div>
            }
          >
            <Title level={3}>分类标签</Title>
            <Paragraph>按主题浏览相关内容</Paragraph>
            <Link href={Path.CATEGORIES}>
              <Button type="primary">浏览分类</Button>
            </Link>
          </Card>

          <Card 
            className="text-center hover:shadow-lg transition-shadow"
            cover={
              <div className="h-32 bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center">
                <span className="text-4xl">👥</span>
              </div>
            }
          >
            <Title level={3}>作者信息</Title>
            <Paragraph>了解更多关于作者的信息</Paragraph>
            <Link href={Path.AUTHORS}>
              <Button type="primary">认识作者</Button>
            </Link>
          </Card>
        </div>

        <div className="text-center">
          <Title level={2} className="text-gray-700 mb-8">
            开始探索
          </Title>
          <div className="space-x-4">
            <Link href={Path.POSTS}>
              <Button size="large" type="primary">
                阅读文章
              </Button>
            </Link>
            <Link href={Path.LOGIN}>
              <Button size="large">
                登录 / 注册
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
