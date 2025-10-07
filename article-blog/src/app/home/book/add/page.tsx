"use client";
import { api } from "@/api/api";
import { BookType } from "@/types";
import { PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Cascader,
  Checkbox,
  ColorPicker,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Rate,
  Select,
  Slider,
  Switch,
  TreeSelect,
  Upload,
} from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/hooks";

const { RangePicker } = DatePicker;
const { TextArea } = Input;

export default function Book_Add() {
  const { t } = useTranslation();
  const [options, setOptions] = useState<{ label: string; value: string }[]>(
    []
  );
  const [isUploadImage, setIsUploadImage] = useState<boolean>(false);
  const [bookData, setBookData] = useState<BookType>();

  useEffect(() => {
    api.getCategoryList().then((res) => {
      const _options = res?.map((item) => ({
        label: item.name,
        value: item._id ?? "",
      }));
      setOptions(_options || []);
    });
  },  []);

  return (
    <main className="flex items-center justify-center mt-4 !mr-10   ">
      <>
        <Form
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 20 }}
          layout="horizontal"
          style={{ width: 500, maxWidth: 1000 }}
          onFinish={(values) => {
            console.log(values);
          }}
          onFinishFailed={(errorInfo) => {
            console.log("Failed:", errorInfo);
          }}
        >
          <Form.Item
            label={t("名称")}
            name="name"
            rules={[{ required: true, message: t("请输入名称") }]}
          >
            <Input
              onChange={(e) => {
                setBookData({ ...bookData, name: e.target.value } as BookType);
              }}
            />
          </Form.Item>
          <Form.Item
            label={t("作者")}
            name="author"
            rules={[{ required: true, message: t("请输入作者") }]}
          >
            <Input
              onChange={(e) => {
                setBookData({
                  ...bookData,
                  author: e.target.value,
                } as BookType);
              }}
            />
          </Form.Item>
          <Form.Item
            label={t("分类")}
            name="category"
            rules={[{ required: true, message: t("请选择分类") }]}
          >
            <Select
              options={options}
              onChange={(e) => {
                setBookData({ ...bookData, category: e } as BookType);
              }}
            ></Select>
          </Form.Item>

          <Form.Item label={t("封面")} valuePropName="fileList">
            <Upload
              listType="picture-card"
              onChange={(upload) => {
                setIsUploadImage(upload.fileList.length !== 0);
              }}
            >
              {isUploadImage ? null : (
                <Button
                  style={{
                    color: "inherit",
                    cursor: "inherit",
                    border: 0,
                    background: "none",
                  }}
                >
                  <PlusOutlined />
                </Button>
              )}
            </Upload>
          </Form.Item>
          <Form.Item label={t("出版日期")}>
            <DatePicker
              onChange={(date, dateString) => {
                setBookData({
                  ...bookData,
                  publishedDate: dateString,
                } as BookType);
              }}
            />
          </Form.Item>
          <Form.Item label={t("描述")}>
            <TextArea
              rows={4}
              onChange={(e) => {
                setBookData({
                  ...bookData,
                  description: e.target.value,
                } as BookType);
              }}
            />
          </Form.Item>
          <Form.Item className="flex justify-center !ml-10">
            <Button type="primary" htmlType="submit">{t("创建")}</Button>
          </Form.Item>
        </Form>
      </>
    </main>
  );
}
