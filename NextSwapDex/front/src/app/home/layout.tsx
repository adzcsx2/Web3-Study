"use client";
import React, { useState } from "react";
import Image from "next/image";
import {
  AuditOutlined,
  BookOutlined,
  LayoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Layout as AntdLayout, Button, Menu, Typography } from "antd";
import { usePathname, useRouter } from "next/navigation";
import i18n from "@/i18n";
import { useTranslation } from "@/i18n";

const { Header, Content, Sider } = AntdLayout;

function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname(); // 获取当前路径
  const [label] = useState("");

  return (
    <AntdLayout className="w-full min-h-screen flex flex-col ">
      <Header className="!bg-white h-16 flex items-center">
        <div className="flex items-center ">
          <Typography.Title level={3} className="m-0">
            Stake质押平台
          </Typography.Title>
          <Typography.Title level={1} className="m-0">
            安全、透明的以太坊质押服务
          </Typography.Title>
          <Button type="primary">连接钱包</Button>
        </div>
      </Header>
      <div className=" !flex-1 !w-full mt-0.5  ">
        {/* 侧边栏  */}
        <AntdLayout className="h-full flex flex-col">
          {/* 内容区  */}
          <Content className="p-10 h-full flex flex-col flex-1">
            {/* 标题  */}
            <p className="text-4xl ">{label}</p>
            <div className="rounded-lg  p-5  bg-white mt-5 h-full ">
              {children}
            </div>
          </Content>
        </AntdLayout>
      </div>
    </AntdLayout>
  );
}

export default HomeLayout;
