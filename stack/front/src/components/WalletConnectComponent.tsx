"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import React from "react";
import { Button, Space } from "antd";

export const WalletConnectComponent = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button
                    onClick={openConnectModal}
                    type="primary"
                    size="middle"
                  >
                    连接钱包
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    danger
                    type="primary"
                    size="middle"
                  >
                    切换网络
                  </Button>
                );
              }

              return (
                <Space size="small">
                  <Button
                    onClick={openChainModal}
                    type="default"
                    size="middle"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </div>
                    )}
                    <span className="hidden sm:inline">{chain.name}</span>
                  </Button>
                  <Button
                    onClick={openAccountModal}
                    type="primary"
                    size="middle"
                  >
                    {/* 在移动端只显示省略的地址，桌面端显示完整信息 */}
                    <span className="sm:hidden">
                      {account.displayName.slice(0, 2)}...
                      {account.displayName.slice(-3)}
                    </span>
                    <span className="hidden sm:inline">
                      {account.displayName}
                      {account.displayBalance
                        ? ` (${account.displayBalance})`
                        : ""}
                    </span>
                  </Button>
                </Space>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
