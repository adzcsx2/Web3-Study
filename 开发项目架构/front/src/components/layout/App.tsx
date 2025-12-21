"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Button, Layout, Menu, Typography } from "antd";
import Image from "next/image";
import styles from "./App.module.css";
import ExchangeCoinInput from "../ui/ExchangeCoinInput";
import { SwapToken } from "@/types/";
const { Header, Content, Footer } = Layout;
import ChangeSwapButton from "../ui/button/ExchangeSwapButton";
import { WalletConnectComponent } from "../ui/WalletConnectComponent";
import { useSwapTokenSelect } from "@/hooks/swaptokenSelect";
import { TAG_TOKEN_SELECT } from "@/types/Enum";
import { Path } from "@/router/path";
import { useRouter } from "next/navigation";
const MainHeader: React.FC = () => {
  const router = useRouter();

  const handleMenuClick = useCallback((path: string) => {
    router.push(path);
  }, []);

  const items = [
    { key: "1", label: "交易", path: Path.HOME },
    { key: "2", label: "添加流动性", path: Path.ADD_LIQUIDITY },
    { key: "3", label: "流动性挖矿", path: Path.PLEDGE_LIQUIDITY },
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
          onClick={(key) => handleMenuClick(items[Number(key.key) - 1].path)}
        />
      </div>
      <div className="ml-auto">
        <WalletConnectComponent></WalletConnectComponent>
      </div>
    </Header>
  );
};

const MainContent: React.FC = () => {
  const [defaultSellToken, setDefaultSellToken] = useState<
    SwapToken | undefined
  >({
    tokenSymbol: "ETH",
    tokenAddress: "",
    tokenDecimals: 18,
    tokenLogoURI: "",
    chainId: 1,
    balance: "0",
  });
  const [defaultBuyToken, setDefaultBuyToken] = useState<SwapToken | undefined>(
    undefined
  );
  const setSelectedToken = useSwapTokenSelect(
    (state) => state.setSelectedToken
  );

  useEffect(() => {
    setSelectedToken(TAG_TOKEN_SELECT.TOP, defaultSellToken);
  }, [defaultSellToken, setSelectedToken]);

  useEffect(() => {
    setSelectedToken(TAG_TOKEN_SELECT.BOTTOM, defaultBuyToken);
  }, [defaultBuyToken, setSelectedToken]);

  return (
    <Content
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "24px",
        minHeight: "80vh",
      }}
    >
      <div className="text-center">
        <Typography.Title className="mt-5 !text-6xl !mb-[2rem] ">
          Swap Any You Want
        </Typography.Title>
        <ExchangeCoinInput swap={"sell"} tag={TAG_TOKEN_SELECT.TOP} />
        <ChangeSwapButton className="   translate-y-[-40%] z-10 " />
        <ExchangeCoinInput
          className=" !bg-bg-gray translate-y-[-25%] "
          swap={"buy"}
          tag={TAG_TOKEN_SELECT.BOTTOM}
        />
        <Button className="btn w-120 translate-y-[-2rem] ">审查</Button>
      </div>
    </Content>
  );
};
const MainFooter: React.FC = () => {
  return (
    <Footer style={{ padding: "24px", textAlign: "center" }}>
      <Typography.Text style={{ fontSize: 14, color: "#999999" }}>
        ©2025 Created by NextSwapDex Team
      </Typography.Text>
    </Footer>
  );
};

export { MainHeader, MainContent, MainFooter };
