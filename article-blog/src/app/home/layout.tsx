"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  AuditOutlined,
  BookOutlined,
  DownOutlined,
  LayoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Layout as AntdLayout, Menu, Dropdown, Space } from "antd";
import { usePathname, useRouter } from "next/navigation";
import i18n from "@/i18n";
import { Path } from "@/router/path";
import { useTranslation } from "@/i18n/hooks";

const { Header, Content, Footer, Sider } = AntdLayout;

const ITEM = [
  {
    key: "book",
    label: i18n.t("图书管理"),
    icon: <BookOutlined />,
    children: [
      { key: "/home/book/list", label: i18n.t("图书列表") },
      { key: "/home/book/add", label: i18n.t("图书添加") },
    ],
  },
  {
    key: "borrow",
    label: i18n.t("借阅管理"),
    icon: <AuditOutlined />,
    children: [
      { key: "/home/borrow/list", label: i18n.t("借阅列表") },
      { key: "/home/borrow/book_borrow", label: i18n.t("书籍借阅") },
    ],
  },
  {
    key: "/home/category",
    label: i18n.t("分类管理"),
    icon: <LayoutOutlined />,
  },
  {
    key: "user",
    label: i18n.t("用户管理"),
    icon: <UserOutlined />,
    children: [
      { key: "/home/user/list", label: i18n.t("用户列表") },
      { key: "/home/user/add", label: i18n.t("用户添加") },
    ],
  },
];

function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname(); // 获取当前路径
  const [label, setLabel] = useState("");

  return (
    <AntdLayout className="w-full min-h-screen flex flex-col ">
      <Header className="!bg-white h-16 flex items-center">
        <div className="flex items-center ">
          <Image src="/logo.svg" width={30} height={30} alt="Logo" />
          <span className="ml-2 text-blue-400 text-xl font-bold">
            {t("三木图书管理系统")}
          </span>
        </div>
      </Header>
      <div className=" !flex-1 !w-full mt-0.5  ">
        {/* 侧边栏  */}
        <AntdLayout className="h-full flex flex-col">
          <Sider width={200}>
            <Menu
              mode="inline"
              selectedKeys={pathname ? [pathname] : []}
              defaultOpenKeys={["book", "borrow", "user"]}
              style={{ height: "100%" }}
              items={ITEM}
              onSelect={({ key }) => {
                router.push(key);
              }}
            />
          </Sider>
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
