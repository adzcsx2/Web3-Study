"use client";
import React, { useState, useEffect } from "react";
import { Space, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import { User } from "@/types";
import { api } from "@/api/api";
import { useRouter } from "next/navigation";
import { Path } from "@/router/path";
import { useHomeTitle } from "@/stores/home-title";
import { useTranslation } from "@/i18n/hooks";

export default function UserList() {
  const [user, setUser] = useState<User[]>([]);
  const { t } = useTranslation();
  const router = useRouter();

  const columns: TableProps<User>["columns"] = [
    {
      title: t("账号"),
      dataIndex: "name",
      key: "name",
      render: (text) => <a>{text}</a>,
    },
    {
      title: t("用户名"),
      dataIndex: "nickName",
      key: "nickName",
    },
    {
      title: t("状态"),
      dataIndex: "status",
      key: "status",
      render: (_, { status }) => {
        switch (status) {
          case "off":
            return <Tag color="red">{t("禁用")}</Tag>;
          case "pending":
            return <Tag color="orange">{t("待审核")}</Tag>;
          case "on":
            return <Tag color="green">{t("正常")}</Tag>;
          default:
            return <Tag color="default">{t("未知")}</Tag>;
        }
      },
    },
    {
      title: t("创建时间"),
      dataIndex: "create",
      key: "status",
      render: () => (
        <Typography.Text>{dayjs().format("YYYY-MM-DD")}</Typography.Text>
      ),
    },
    {
      title: t("操作"),
      render: (user) => (
        <Space size="middle">
          <Typography.Text
            className="!text-blue-500"
            style={{ cursor: "pointer" }}
            onClick={() => {
              useHomeTitle.setState({ title: t("用户编辑") });
              router.push(Path.USER_EDIT(user._id!));
            }}
          >
            {t("编辑")}
          </Typography.Text>
          <Typography.Text
            className="!text-red-500 ml-5"
            style={{ cursor: "pointer" }}
            onClick={() => {
              console.log(user);

              const newStatus = user.status === "on" ? "off" : "on";
              setUser((prev) =>
                prev.map((u) => {
                  if (u._id === user._id) {
                    return { ...u, status: newStatus };
                  }
                  return u;
                })
              );
            }}
          >
            {t("禁用")}
          </Typography.Text>
          <Typography.Text
            className="!text-red-500 ml-5"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setUser((prev) => prev.filter((u) => u._id !== user._id));
            }}
          >
            {t("删除")}
          </Typography.Text>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    api.getUserList().then((data) => {
      setUser(data ? data : []);
    });
  }, []);

  return <Table<User> columns={columns} dataSource={user} rowKey="_id"></Table>;
}
