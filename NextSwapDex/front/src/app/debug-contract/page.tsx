"use client";

import React from "react";
import { Typography } from "antd";
import ContractDebugger from "@/examples/ContractDebugger";

/**
 * 合约调试页面
 */
const DebugContractPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <Typography.Title level={1} className="text-center mb-4">
          合约调试工具
        </Typography.Title>

        <Typography.Text className="block text-center text-gray-500 mb-8">
          用于诊断和调试本地测试网上的智能合约
        </Typography.Text>

        <ContractDebugger />
      </div>
    </div>
  );
};

export default DebugContractPage;