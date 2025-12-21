"use client";
import React, { useState } from "react";
import { Layout } from "antd";
import { MainHeader, MainFooter } from "@/components/layout/App";

const { Content } = Layout;

function LiquidityAdd({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <Layout>
        <MainHeader />
        <Content style={{ padding: "20px 50px", minHeight: "80vh" }}>
          {children}
        </Content>
        <MainFooter />
      </Layout>
    </div>
  );
}

export default LiquidityAdd;
