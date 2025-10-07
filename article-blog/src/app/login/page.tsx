"use client";
import { Button, Form, FormProps, Image, Input, Typography } from "antd";
import { use, useEffect, useState } from "react";

import { api } from "@/api/api";
import { LoginReq } from "@/types/login";
import { useTranslation } from "@/i18n/hooks";
import { useUserStore } from "@/stores/userStore";
import { Path } from "@/router/path";
import { useRouter } from "next/navigation";
import { User } from "@/types/user";

export default function Login() {
  const { t } = useTranslation("common");

  const [loginState, setLoginState] = useState({ status: "", message: "" });

  const userStore = useUserStore();
  const router = useRouter();
  const onFinish: FormProps<LoginReq>["onFinish"] = (values) => {
    api
      .login({ name: values.name, password: values.password }, true)
      .then((data) => {
        // 后端会通过 Set-Cookie 头自动设置 HttpOnly Cookie
        // 前端不需要手动存储 token
        console.log("postLogin success:", data);
        // 登录成功后跳转到主页或其他页面
        userStore.setUser(data as User);
        router.push(Path.HOME);
      });
  };

  const onFinishFailed: FormProps<LoginReq>["onFinishFailed"] = (errorInfo) => {
    console.log("Failed:", errorInfo);
    setLoginState({
      status: "error",
      message: errorInfo.errorFields[0].errors[0],
    });
  };
  return (
    <main className="!flex !flex-col !items-center !justify-center !min-h-screen !min-w-screen bg-gray-100">
      <div className="!flex !items-center !justify-center ">
        <Image
          className=" !mr-4"
          src="/logo.svg"
          alt="Logo"
          width={100}
          height={100}
          preview={false}
        />
        <Typography.Title
          level={1}
          className="!text-[#487BD8] !m-0 !leading-none !ml-5"
        >
          {t("图书管理系统")}
        </Typography.Title>
      </div>

      <Form
        className=")!mt-10 !w-120 !justify-center !items-center rounded-lg !p-10 !shadow-lg bg-white"
        name="basic"
        layout="vertical"
        initialValues={{ remember: true }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <Form.Item<LoginReq>
          label={t("账号")}
          name="name"
          rules={[{ required: true, message: t("请输入账号") }]}
        >
          <Input className="!w-full" />
        </Form.Item>

        <Form.Item<LoginReq>
          label={t("密码")}
          name="password"
          rules={[
            { required: true, message: t("请输入密码") },
            { min: 6, message: t("密码至少6位") },
          ]}
        >
          <Input.Password className="!w-full" />
        </Form.Item>

        <Form.Item label={null}>
          <Button className="!w-full mt-5" type="primary" htmlType="submit">
            {t("登录")}
          </Button>
        </Form.Item>
      </Form>
    </main>
  );
}
