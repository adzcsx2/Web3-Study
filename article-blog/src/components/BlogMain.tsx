"use client";
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Typography,
  Divider,
  List,
  Skeleton,
} from "antd";
import React, { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { PostService } from "@/services/postService";
import { PostType } from "@/types/article";
import dayjs from "dayjs";
import t from "@/i18n/lang/zh/common";

interface ModalType {
  type: "add" | "edit";
  data?: PostType;
}

export default function BlogMain() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PostType[]>([]);
  const [total, setTotal] = useState(0);
  const [title, setTitle] = useState("");
  const [page, setPage] = useState(1);
  const [modalType, setModalType] = useState<ModalType>({ type: "add" });
  const [modalOpen, setModalOpen] = useState(false);
  const [createBlogForm] = Form.useForm();
  const [form] = Form.useForm();

  // 加载更多博客数据，支持分页加载
  const loadMoreData = (resetPage = false) => {
    if (loading) return;

    setLoading(true);
    message.loading({ content: t["加载中"], key: "loading" });
    const currentPage = resetPage ? 1 : page;

    PostService.getPosts({
      title,
      sort: "created_at",
      order: "desc",
      pageSize: 10,
      current: currentPage,
    })
      .then((res) => {
        const results = Array.isArray(res.data) ? res.data : [];
        if (currentPage === 1) {
          setData(results);
        } else {
          setData((prev) => [...prev, ...results]);
        }
        setTotal(res.total || 0);
        setPage(currentPage + 1);
      })
      .catch((error) => {
        console.error("Failed to fetch posts:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // 处理博客标题搜索功能
  const handleSearch = (values: { title: string }) => {
    setTitle(values.title || "");
    loadMoreData(true);
  };

  // 打开添加博客的模态框
  const handleAddClick = () => {
    setModalOpen(true);
  };

  // 打开编辑博客的模态框并填充表单数据
  const handleEditClick = (item: PostType) => {
    setModalType({ type: "edit", data: item });
    createBlogForm.setFieldsValue({
      title: item.title,
      content: item.content,
    });
    setModalOpen(true);
  };

  // 处理删除博客操作
  const handleDeleteClick = (item: PostType) => {
    PostService.deletePost(item.id!)
      .then(() => {
        message.success(t["删除成功"]);
        loadMoreData(true);
      })
      .catch((error) => {
        console.error("Failed to delete post:", error);
        message.error(`${t["删除失败"]}: ${error.message}`);
      });
  };

  // 验证博客表单的标题和内容是否为空
  const validateForm = (title: string, content: string) => {
    if (!title?.trim()) {
      message.error(t["标题不能为空"]);
      return false;
    }
    if (!content?.trim()) {
      message.error(t["内容不能为空"]);
      return false;
    }
    return true;
  };

  // 处理模态框确认操作，创建或更新博客
  const handleModalOk = () => {
    const { title, content } = createBlogForm.getFieldsValue();

    if (!validateForm(title, content)) return;

    const postData = { title, content };

    if (modalType.type === "edit") {
      PostService.updatePost(modalType.data!.id!, postData)
        .then(() => {
          message.success(t["修改成功"]);
          resetModal();
        })
        .catch((error) => {
          console.error("Failed to update post:", error);
          message.error(`${t["更新失败"]}: ${error.message}`);
        });
    } else {
      PostService.createPost(postData)
        .then(() => {
          message.success(t["创建成功"]);
          resetModal();
        })
        .catch((error) => {
          console.error("Failed to create post:", error);
          message.error(`${t["创建失败"]}: ${error.message}`);
        });
    }
  };

  // 重置模态框状态并刷新数据
  const resetModal = () => {
    setModalOpen(false);
    createBlogForm.resetFields();
    loadMoreData(true);
  };

  // 处理模态框取消操作
  const handleModalCancel = () => {
    setModalOpen(false);
  };

  // 渲染博客列表项，包含标题、内容、时间和操作按钮
  const renderListItem = (item: PostType) => (
    <div className="flex items-center">
      <List.Item key={item.title}>
        <List.Item.Meta
          className="!mb-1"
          title={
            <a className="!text-lg" href="#">
              {item.title}
            </a>
          }
          description={item.content}
        />
        <Typography.Text className="!text-gray-400">
          {dayjs(item.created_at).format("YYYY-MM-DD HH:mm:ss")}
        </Typography.Text>
      </List.Item>
      <Button
        className="ml-auto"
        type="primary"
        onClick={() => handleEditClick(item)}
      >
        {t["编辑"]}
      </Button>
      <Button
        className="ml-3"
        type="primary"
        danger
        onClick={() => handleDeleteClick(item)}
      >
        {t["删除"]}
      </Button>
    </div>
  );

  useEffect(() => {
    loadMoreData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main>
      <Form
        className="flex justify-center mt-10"
        layout="inline"
        form={form}
        initialValues={{ layout: "inline" }}
        style={{ maxWidth: "none" }}
        onFinish={handleSearch}
      >
        <Form.Item name="title" key={title} className="w-2/3">
          <Input placeholder={t["请输入博客标题"]} allowClear />
        </Form.Item>
        <Form.Item>
          <Button htmlType="submit" type="primary">
            {t["搜索"]}
          </Button>
        </Form.Item>
        <Form.Item>
          <Button type="primary" danger onClick={handleAddClick}>
            {t["添加"]}
          </Button>
        </Form.Item>
      </Form>

      <div className="mt-8" id="scrollableDiv">
        <Divider orientation="left" />
        <InfiniteScroll
          height={500}
          dataLength={data.length}
          next={() => loadMoreData(false)}
          hasMore={data.length < total}
          loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
          scrollableTarget="scrollableDiv"
        >
          <List
            itemLayout="vertical"
            dataSource={data}
            renderItem={renderListItem}
          />
        </InfiniteScroll>
      </div>

      <Modal
        centered
        closable={false}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
      >
        <Typography.Title className="text-center" level={4}>
          {modalType.type === "edit" ? t["更新博客"] : t["添加博客"]}
        </Typography.Title>
        <Form className="!mt-5" form={createBlogForm}>
          <Form.Item name="title" key="title">
            <Input placeholder={t["请输入博客标题"]} />
          </Form.Item>
          <Form.Item name="content" key="content">
            <Input.TextArea rows={4} placeholder={t["请输入博客内容"]} />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
