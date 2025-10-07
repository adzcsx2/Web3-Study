"use client";

import { LoginFormValues } from "@/types/login";
import React from "react";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Checkbox, Form, Input, Flex, Typography, Image } from "antd";
import { Path } from "@/router/path";
import { AuthService } from "@/services/authService";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();

  const onFinish = (values: LoginFormValues) => {
    console.log("Received values of form: ", values);

    AuthService.signUp(values.username, values.password)
      .then((data) => {
        console.log("注册成功:", data);
        router.push(Path.LOGIN);
      })
      .catch((error) => {
        console.error("注册失败:", error);
        alert("注册失败: " + error.message);
      });
  };

  return (
    <main className="!flex !flex-col !items-center !justify-center !min-h-screen !min-w-screen bg-gray-100">
      <div className="flex items-center mb-5">
        <Image
          className="!h-20 !w-20 !mr-4"
          src="/logo.svg"
          preview={false}
          alt="Logo"
        />
        <Typography.Title className="!mb-0" level={2}>
          {"注册"}
        </Typography.Title>
      </div>

      <Form
        className="!mt-15"
        name="login"
        initialValues={{ remember: true }}
        style={{ width: "40%" }}
        onFinish={onFinish}
      >
        <Form.Item
          name="username"
          rules={[
            { required: true, message: "请输入账号!" },
            { min: 5, message: "账号名至少需要5个字符!" },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            type="email"
            placeholder="Username"
          />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[
            { required: true, message: "请输入密码!" },
            { min: 6, message: "密码至少需要6位!" },
          ]}
        >
          <Input
            prefix={<LockOutlined />}
            type="password"
            placeholder="Password"
          />
        </Form.Item>
        <Form.Item>
          <Flex justify="space-between" align="center">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住我</Checkbox>
            </Form.Item>
          </Flex>
        </Form.Item>

        <Form.Item>
          <Button block type="primary" htmlType="submit">
            注册
          </Button>
        </Form.Item>
      </Form>
    </main>
  );
}
