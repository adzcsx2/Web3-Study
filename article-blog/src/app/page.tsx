"use client";
import { Layout, Image, Typography } from "antd";

import HomeHeaderLogin from "@/components/HomeHeaderLogin";

export default function Home() {
  return (
    <Layout>
      <Layout.Header
        className="!flex !items-center"
        style={{ background: "#001529", padding: "0 24px" }}
      >
        <Image
          className="!h-full !w-10"
          src="/logo.svg"
          preview={false}
          alt="Logo"
        />
        <Typography.Title
          className="!text-white !ml-5 !mb-0"
          level={4}
          style={{ margin: 0, height: "64px", lineHeight: "64px" }}
        >
          文章博客
        </Typography.Title>

        <HomeHeaderLogin className="!ml-auto" />
      </Layout.Header>
      <Layout.Content
        style={{ padding: "48px", minHeight: "calc(100vh - 134px)" }}
      >
        <div
          style={{
            background: "#fff",
            padding: "24px",
            borderRadius: "8px",
            minHeight: "400px",
          }}
        >
          <h1>欢迎来到文章博客</h1>
          <p>这是一个基于 Next.js 和 Ant Design 的博客系统</p>
        </div>
      </Layout.Content>
      <Layout.Footer style={{ textAlign: "center", background: "#f0f2f5" }}>
        ©{new Date().getFullYear()} Created by adzcsx2
      </Layout.Footer>
    </Layout>
  );
}
