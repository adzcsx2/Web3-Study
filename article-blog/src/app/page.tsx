"use client";
import React from "react";
import { Breadcrumb, Layout, Menu, theme, Image, Typography } from "antd";
import Title from "antd/es/skeleton/Title";
import { t } from "i18next";
import Home from "./home/page";
import HomeHeaderLogin from "@/components/HomeHeaderLogin";

const { Header, Content, Footer } = Layout;

const App: React.FC = () => {
  return (
    <Layout>
      <Header className="!flex  !items-center ">
        <Image
          className="!h-full !w-10"
          src="/logo.svg"
          preview={false}
          alt="Logo"
        />
        <Typography.Title
          className="!text-white !items-center !h-full !justify-center content-center ml-5 mt-2"
          level={4}
        >
          {t("标题")}
        </Typography.Title>

        <HomeHeaderLogin className="!ml-auto" />
      </Header>
      <Content style={{ padding: "0 48px" }}>
        <div>Content</div>
      </Content>
      <Footer style={{ textAlign: "center" }}>
        ©{new Date().getFullYear()} Created by adzcsx2
      </Footer>
    </Layout>
  );
};

export default App;
