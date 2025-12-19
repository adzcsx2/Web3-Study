"use client";
import React from "react";
import {
  Card,
  Button,
  Input,
  Typography,
  Menu,
  Layout,
  Space,
  Divider,
} from "antd";
import ScaleController from "@/components/ui/ScaleController";
import { useTranslation } from "@/i18n/hooks";

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const ScaleDemo: React.FC = () => {
  const { t } = useTranslation();

  const menuItems = [
    { key: "1", label: "菜单项 1" },
    { key: "2", label: "菜单项 2" },
    { key: "3", label: "菜单项 3" },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Title level={3} style={{ margin: 0, color: "#1890ff" }}>
          质押平台
        </Title>
        <Space>
          <span>界面缩放：</span>
          <ScaleController />
        </Space>
      </Header>

      <Content style={{ padding: "24px" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Card
            title="全局缩放演示"
            extra={t("common.adjust")}
            style={{ width: "100%" }}
          >
            <Paragraph>
              通过调整全局缩放，可以改变整个应用的大小，包括antd组件和Tailwind的间距。
            </Paragraph>

            <Divider />

            <Space direction="vertical" style={{ width: "100%" }}>
              <Title level={4}>按钮组件</Title>
              <Space wrap>
                <Button type="primary">主要按钮</Button>
                <Button>默认按钮</Button>
                <Button type="dashed">虚线按钮</Button>
                <Button type="link">链接按钮</Button>
              </Space>

              <Title level={4}>输入框组件</Title>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Input placeholder="请输入内容" style={{ width: 300 }} />
                <Input.Password
                  placeholder="请输入密码"
                  style={{ width: 300 }}
                />
                <TextArea
                  rows={4}
                  placeholder="多行文本输入"
                  style={{ width: 500 }}
                />
              </Space>

              <Title level={4}>文本组件</Title>
              <Space direction="vertical">
                <Title level={3}>三级标题</Title>
                <Paragraph>
                  这是一段普通的段落文本。当你调整全局缩放时，所有文本大小都会相应改变。
                </Paragraph>
                <Text type="secondary">次要文本</Text>
                <Text type="success">成功状态文本</Text>
                <Text type="warning">警告状态文本</Text>
                <Text type="danger">危险状态文本</Text>
              </Space>
            </Space>
          </Card>

          <Card title="Tailwind 间距演示" style={{ width: "100%" }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <div className="p-4 bg-gray-100">
                <p>padding: 4 (1rem)</p>
              </div>
              <div className="p-8 bg-gray-200">
                <p>padding: 8 (2rem)</p>
              </div>
              <div className="p-12 bg-gray-300">
                <p>padding: 12 (3rem)</p>
              </div>
              <div className="gap-4 grid grid-cols-3">
                <div className="bg-blue-100 p-4 text-center">1</div>
                <div className="bg-blue-200 p-4 text-center">2</div>
                <div className="bg-blue-300 p-4 text-center">3</div>
              </div>
            </Space>
          </Card>

          <Card title="使用说明" style={{ width: "100%" }}>
            <ol style={{ paddingLeft: 20 }}>
              <li>点击右上角的缩放下拉菜单选择不同的尺寸</li>
              <li>小尺寸 (14px): 适合信息密集的界面</li>
              <li>中等尺寸 (16px): 默认设置，平衡了信息密度和可读性</li>
              <li>大尺寸 (18px): 适合移动端或需要更大字体的场景</li>
              <li>超大尺寸 (20px): 适合大屏设备或无障碍场景</li>
            </ol>
            <Paragraph>
              所有设置会自动保存到本地存储，下次访问时会记住你的选择。
            </Paragraph>
          </Card>
        </Space>
      </Content>
    </Layout>
  );
};

export default ScaleDemo;
