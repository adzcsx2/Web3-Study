import React from "react";
import { Layout, Menu, Typography } from "antd";
import Image from "next/image";
import styles from "./App.module.css";
import ExchangeCoinInput from "../ui/ExchangeCoinInput";
import { SwapType } from "@/types/";
const { Header, Content, Footer } = Layout;
const MainHeader: React.FC = () => {
  const items = [
    { key: "1", label: "交易" },
    { key: "2", label: "添加流动性" },
    { key: "3", label: "流动性挖矿" },
  ];

  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
      }}
    >
      <Image
        src="logo.svg"
        alt="Logo"
        width={120}
        height={31}
        style={{ marginRight: "20px" }}
      />
      <div className={styles.menuNoUnderline}>
        <Menu
          theme="light"
          mode="horizontal"
          defaultSelectedKeys={["1"]}
          items={items}
          style={{
            flex: 1,
            minWidth: 0,
            marginRight: "20px",
          }}
        />
      </div>
    </Header>
  );
};

const MainContent: React.FC = () => {
  return (
    <Content
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "24px",
        minHeight: "80vh",
      }}
    >
      <div>
        <Typography.Title
          className="mt-5 text-6xl!"
          style={{ marginBottom: "2rem" }}
        >
          Swap Any You Want
        </Typography.Title>
        <ExchangeCoinInput swap={"sell"} />
        <ExchangeCoinInput swap={"buy"} />
      </div>
    </Content>
  );
};
const MainFooter: React.FC = () => {
  return (
    <Footer style={{ padding: "24px", minHeight: "80vh", textAlign: "center" }}>
      <Typography.Text style={{ fontSize: 14, color: "#999999" }}>
        ©2025 Created by NextSwapDex Team
      </Typography.Text>
    </Footer>
  );
};

export { MainHeader, MainContent, MainFooter };
