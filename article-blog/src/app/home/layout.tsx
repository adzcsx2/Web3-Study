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
import { useUserStore } from "@/stores/userStore";
import { api } from "@/api/api";
import { Path } from "@/router/path";
import { useTranslation } from "@/i18n/hooks";
import { useHomeTitle } from "@/stores/home-title";

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

  const userStore = useUserStore();

  const menuItem: MenuProps["items"] = [
    i18n.t("个人中心"),
    i18n.t("退出登录"),
  ].map((key) => ({
    key,
    label: `${key}`,
  }));

  useEffect(() => {
    setLabel("");

    const unsub = useHomeTitle.subscribe((state) => {
      setLabel(state.title ? state.title : "");
    });
    return unsub;
  }, []);

  useEffect(() => {
    // 获取用户信息,第一次进来没登录,跳转到登录页
    if (!useUserStore.getState().user?._id) {
      router.push(Path.LOGIN);
      return;
    }
    // 订阅用户状态变化, 如果用户信息变成空了,说明退出登录了,跳转到登录页
    const unsub = useUserStore.subscribe((state) => {
      if (!state.user?._id) {
        router.push(Path.LOGIN);
      }
    });

    return unsub;
  }, [router]);

  useEffect(() => {
    // pathname can be null during initial render in Next.js, guard it
    if (!pathname) return;

    // 初始化路由页面
    if (pathname === "/home") {
      const firstChild = ITEM[0]?.children?.[0];
      if (firstChild) {
        const key = firstChild.key as string;
        router.push(key);
      }
    }
    getCurrentLabel(pathname);
  }, [pathname, router]);

  function getCurrentLabel(key: string) {
    ITEM.forEach((item) => {
      if (item.children) {
        item.children?.forEach((child) => {
          if (child.key === key) {
            useHomeTitle.setState({ title: child.label as string });
            // setLabel(child.label as string);
          }
        });
      } else {
        if (item.key === key) {
          useHomeTitle.setState({ title: item.label as string });
          // setLabel(item.label as string);
        }
      }
    });
  }
  return (
    <AntdLayout className="w-full min-h-screen flex flex-col ">
      <Header className="!bg-white h-16 flex items-center">
        <div className="flex items-center ">
          <Image src="/logo.svg" width={30} height={30} alt="Logo" />
          <span className="ml-2 text-blue-400 text-xl font-bold">
            {t("三木图书管理系统")}
          </span>
        </div>

        <Dropdown
          className=" ml-auto"
          menu={{
            items: menuItem,
            onClick: (key) => {
              switch (key.key) {
                case i18n.t("退出登录"):
                  api.logout().then(() => {
                    userStore.logout();
                    router.push(Path.LOGIN);
                  });
                  return;
                case i18n.t("个人中心"):
                  if (userStore.user) {
                    useHomeTitle.setState({ title: i18n.t("个人中心") });
                    // setLabel(i18n.t("个人中心"));
                    router.push(
                      Path.USER_PERSONAL_CENTER(
                        userStore.user._id ? userStore.user._id : ""
                      )
                    );
                  }
                  return;
                default:
                  return;
              }
            },
          }}
        >
          <a onClick={(e) => e.preventDefault()}>
            <Space>
              {userStore.user?.name ? userStore.user.name : t("登录")}
              <DownOutlined />
            </Space>
          </a>
        </Dropdown>
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
