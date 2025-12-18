"use client";
import Image from "next/image";
import React from "react";
import { Breadcrumb, Layout, Menu, theme } from "antd";
const { Header, Content, Footer } = Layout;
const MainHeader: React.FC = () => {
  const items = [
    { key: "1", label: "Home" },
    { key: "2", label: "About" },
    { key: "3", label: "Contact" },
  ];

  return (
    <Header style={{ display: "flex", alignItems: "center" }}>
      <Image
        src="logo.svg"
        alt="Logo"
        width={120}
        height={31}
        style={{ marginRight: "20px" }}
      />
      <Menu
        theme="light"
        mode="horizontal"
        defaultSelectedKeys={["1"]}
        items={items}
        style={{ flex: 1, minWidth: 0 }}
      />
    </Header>
  );
};

export default function Home() {
  return (
    <div>
      <Layout>
        <MainHeader />
        <Content> </Content>
        <Footer style={{ textAlign: "center" }}>
          NextSwapDex ©2024 Created by NextSwapDex Team
        </Footer>
      </Layout>
    </div>
  );
}
