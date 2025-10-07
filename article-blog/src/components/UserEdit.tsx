"use client";
import React, { use, useEffect } from "react";
import { Button, Checkbox, Form, Input, message, Radio } from "antd";
import { User } from "@/types/user";
import { api } from "@/api/api";
import { useTranslation } from "@/i18n/hooks";

export default function UserEdit({ params }: { params?: Promise<{ id?: string }> }) {
  const { t } = useTranslation();
  const userId = params ? use(params).id : undefined;
  const [user, setUser] = React.useState<User | null>(null);
  const [form] = Form.useForm();
  useEffect(() => {
    if (userId) {
      api.getUserInfo(userId).then((data: User | null) => {
        setUser(data);
        if (data) {
          // populate form fields when async data arrives
          form.setFieldsValue({
            nickName: data.nickName,
            userName: data.name,
            status: data.status,
          });
        }
      });
    }
  }, [userId, form]);

  return (
    <Form
      form={form}
      className="!flex !flex-col !items-center !justify-center !mt-10 "
      style={{ width: "100%" }}
      labelCol={{ span: 51 }}
      wrapperCol={{ span: 21 }}
      layout="horizontal"
      onFinish={(values) => {
        console.log(values);

        const userData: User = {
          ...user,
          name: values.userName,
          nickName: values.nickName,
          status: values.status,
        };

        if (!userId) {
          //用户ID为空,新增用户
          api.addUser(userData).then(() => {
            message.success(t("添加成功"));
          });
        } else {
          //用户ID不为空,编辑用户
          api.updateUser(userData).then(() => {
            message.success(t("保存成功"));
          });
        }
      }}
      onFinishFailed={(err) => {
        console.log(err);
      }}
    >
      <Form.Item
        label={t("账号")}
        name={"userName"}
        rules={[{ required: true, message: t("请输入账号") }]}
      >
        <Input placeholder={t("用户登录的账号")} />
      </Form.Item>
      <Form.Item
        label={t("昵称")}
        name={"nickName"}
        rules={[{ required: true, message: t("请输入昵称") }]}
      >
        <Input placeholder={t("用户昵称")} />
      </Form.Item>
      <Form.Item label={t("性别")}>
        <Radio.Group defaultValue={"male"}>
          <Radio value="male">{t("男")}</Radio>
          <Radio value="female">{t("女")}</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item label={t("密码")}>
        <Input.Password placeholder={t("请输入密码")} />
      </Form.Item>

      <Form.Item label={t("状态")} name={"status"}>
        <Radio.Group>
          <Radio value="on">{t("启用")}</Radio>
          <Radio value="off">{t("禁用")}</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item label={t("角色")}>
        <Radio.Group defaultValue={"admin"}>
          <Radio value="admin">{t("管理员")}</Radio>
          <Radio value="user">{t("用户")}</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          {t("保存")}
        </Button>
      </Form.Item>
    </Form>
  );
}
