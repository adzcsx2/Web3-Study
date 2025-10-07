"use client";
import { Button, Input, Select, Table, TableProps, Tooltip } from "antd";
import { useEffect, useRef, useState } from "react";
import { BookListReq, BookType } from "@/types/book";
import { useTranslation } from "@/i18n/hooks";
import { api } from "@/api/api";
import typography from "antd/es/typography";
import Image from "antd/es/image";
import timeUtils from "@/utils/timeUtils";
import { CategoryListReq } from "@/types";

export default function Book() {
  const { t } = useTranslation();
  const [options, setOptions] = useState<{ label: string; value: string }[]>(
    []
  );
  const [bookList, setBookList] = useState<BookType[]>([]);
  const [searchBookName, setSearchBookName] = useState<string>("");
  const [searchAuthor, setSearchAuthor] = useState<string>("");
  const [searchCategory, setSearchCategory] = useState<string>("");

  useEffect(() => {
    searchBookList();

    api.getCategoryList().then((res) => {
      const _options = res?.map((item) => ({
        label: item.name,
        value: item._id ?? "",
      }));
      setOptions(_options || []);
    });
  }, []);

  //   搜索书籍列表
  function searchBookList() {
    const bookListReq: BookListReq = {
      name: searchBookName,
      author: searchAuthor,
      pageSize: 1000,
      current: 1,
    };

    api.getBookList(bookListReq).then((res) => {
      setBookList(res || []);
    });
  }

  const columns: TableProps<BookType>["columns"] = [
    {
      title: t("名称"),
      dataIndex: "name",
      key: "name",
      render: (text) => <typography.Text>{text}</typography.Text>,
    },
    {
      title: t("封面"),
      dataIndex: "cover",
      key: "cover",
      render: () => (
        <Image
          src="https://www.szjlc.cn/nw/thumbnail/8613816169529511936"
          alt="cover"
          width={50}
          height={70}
        />
      ),
    },
    {
      title: t("作者"),
      dataIndex: "author",
      key: "author",
      render: (text) => <typography.Text>{text}</typography.Text>,
    },
    {
      title: t("分类"),
      dataIndex: "category",
      key: "category",
      render: () => <typography.Text>-</typography.Text>,
    },
    {
      width: 400,
      title: t("描述"),
      dataIndex: "description",
      key: "description",
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: t("库存"),
      dataIndex: "stock",
      key: "stock",
      render: (text) => <typography.Text>{text}</typography.Text>,
    },
    {
      title: t("创建时间"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) => (
        <typography.Text>{timeUtils.format(text)}</typography.Text>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-vertical space-x-4 items-center">
        <p className="!flex-1 flex justify-center  ">{t("名称")}</p>
        <Input
          id="bookName"
          className="!flex-3  flex justify-center"
          placeholder={t("请输入书籍名称")}
          value={searchBookName}
          onChange={(e) => setSearchBookName(e.target.value)}
        />
        <p className="!flex-1 flex justify-center">{t("作者")}</p>
        <Input
          id="author"
          className="!flex-3 flex justify-center "
          placeholder={t("请输入")}
          value={searchAuthor}
          onChange={(e) => setSearchAuthor(e.target.value)}
        />
        <p className="!flex-1 flex justify-center">{t("分类")}</p>
        <Select
          id="category"
          className="!flex-3 !mr-4 "
          showSearch
          placeholder={t("请选择")}
          optionFilterProp="name"
          onSearch={() => {}}
          options={options}
          value={searchCategory}
          onChange={(value) => setSearchCategory(value)}
        />
        <Button
          type="primary"
          onClick={() => {
            searchBookList();
          }}
        >
          {t("搜索")}
        </Button>
        <Button
          onClick={() => {
            setSearchBookName("");
            setSearchAuthor("");
            setSearchCategory("");
          }}
        >
          {t("清空")}
        </Button>
      </div>
      <Table<BookType>
        className="mt-5"
        columns={columns}
        dataSource={bookList}
        rowKey="_id"
      />
    </div>
  );
}
