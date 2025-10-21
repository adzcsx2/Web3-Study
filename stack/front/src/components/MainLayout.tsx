"use client";
import React, { useState, useEffect } from "react";
import { Layout as AntdLayout, Typography, message } from "antd";
import WalletConnectModal from "@/components/WalletConnectModal";
import WalletStatus from "@/components/WalletStatus";
import { useWalletStore } from "@/stores/walletStore";

const { Header, Content } = AntdLayout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const { connect, updateChainId, updateBalance } = useWalletStore();

  // 处理钱包连接
  const handleWalletConnect = (walletType: string, address: string) => {
    connect(walletType, address);

    // 获取钱包信息
    updateWalletInfo();

    message.success("钱包连接成功！");
  };

  // 更新钱包信息
  const updateWalletInfo = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        // 获取网络ID
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        updateChainId(chainId);

        // 获取余额
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts && accounts.length > 0) {
          const balance = await window.ethereum.request({
            method: "eth_getBalance",
            params: [accounts[0], "latest"],
          });
          updateBalance(balance);
        }
      } catch (error) {
        console.error("Failed to update wallet info:", error);
      }
    }
  };

  // 监听账户和网络变化
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // 用户断开了连接
          useWalletStore.getState().disconnect();
          message.info("钱包已断开连接");
        } else {
          // 账户发生变化
          updateWalletInfo();
        }
      };

      const handleChainChanged = (chainId: string) => {
        updateChainId(chainId);
        updateWalletInfo();
        message.info("网络已切换");
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      // 初始化时检查是否已连接
      updateWalletInfo();

      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  return (
    <>
      <AntdLayout className="w-full min-h-screen flex flex-col">
        <Header className="!bg-white h-16 flex items-center shadow-sm border-b">
          <div className="flex items-center gap-4 w-full max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-4 flex-1">
              <Typography.Title level={3} className="m-0 text-blue-600">
                Stake质押平台
              </Typography.Title>
              <Typography.Text className="text-gray-500 hidden md:block text-base">
                安全、透明的以太坊质押服务
              </Typography.Text>
            </div>

            <WalletStatus />
          </div>
        </Header>

        <div className="!flex-1 !w-full">
          <AntdLayout className="h-full flex flex-col">
            <Content className="p-6 md:p-10 h-full flex flex-col flex-1">
              <div className="rounded-lg p-5 bg-white h-full shadow-sm">
                {children}
              </div>
            </Content>
          </AntdLayout>
        </div>
      </AntdLayout>

      <WalletConnectModal
        visible={walletModalVisible}
        onClose={() => setWalletModalVisible(false)}
        onConnect={handleWalletConnect}
      />
    </>
  );
};

export default MainLayout;