import React, { useState, useCallback } from "react";
import { Button, Typography, message, Modal } from "antd";
import { LoadingOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { SwapToken, AddLiquidityParams, LiquidityPoolInfo } from "@/types/";
import { useSwapTokenSelect } from "@/hooks/useSwapTokenSelect";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";

const { Text } = Typography;

interface AddLiquidityButtonProps {
  token0Amount: string;
  token1Amount: string;
  poolInfo: LiquidityPoolInfo | null;
  onAddLiquidity?: (params: AddLiquidityParams) => Promise<string>;
  onTransactionComplete?: (hash: string) => void;
  className?: string;
}

interface TransactionStatus {
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error: Error | null;
  txHash: string | null;
}

const AddLiquidityButton: React.FC<AddLiquidityButtonProps> = ({
  token0Amount,
  token1Amount,
  poolInfo,
  onAddLiquidity,
  onTransactionComplete,
  className = "",
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>(
    {
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      error: null,
      txHash: null,
    }
  );

  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();

  // 分别订阅两个 token，避免不必要的重新渲染
  const token0 = useSwapTokenSelect((state) => state.tokens[0]);
  const token1 = useSwapTokenSelect((state) => state.tokens[1]);

  // 检查是否可以添加流动性
  const canAddLiquidity = React.useMemo(() => {
    return (
      isConnected &&
      token0 &&
      token1 &&
      token0Amount &&
      token1Amount &&
      parseFloat(token0Amount) > 0 &&
      parseFloat(token1Amount) > 0 &&
      parseFloat(token0Amount) <= parseFloat(token0.balance || "0") &&
      parseFloat(token1Amount) <= parseFloat(token1.balance || "0")
    );
  }, [isConnected, token0, token1, token0Amount, token1Amount]);

  // 检查余额不足
  const hasInsufficientBalance = React.useMemo(() => {
    if (!token0Amount || !token1Amount || !token0 || !token1) return false;
    return (
      parseFloat(token0Amount) > parseFloat(token0.balance || "0") ||
      parseFloat(token1Amount) > parseFloat(token1.balance || "0")
    );
  }, [token0Amount, token1Amount, token0, token1]);

  // 处理添加流动性
  const handleAddLiquidity = useCallback(async () => {
    if (!canAddLiquidity || !token0 || !token1) {
      return;
    }

    try {
      setTransactionStatus((prev) => ({
        ...prev,
        isPending: true,
        error: null,
      }));

      const params: AddLiquidityParams = {
        token0,
        token1,
        amount0: token0Amount,
        amount1: token1Amount,
        slippageTolerance: 0.5,
        deadline: new Date().getTime() + 20 * 60 * 1000, // 20分钟后
      };

      if (onAddLiquidity) {
        const txHash = await onAddLiquidity(params);
        setTransactionStatus((prev) => ({
          ...prev,
          isPending: false,
          isConfirming: true,
          txHash,
        }));

        if (onTransactionComplete) {
          onTransactionComplete(txHash);
        }
      } else {
        // 模拟交易过程
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const mockTxHash =
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

        setTransactionStatus((prev) => ({
          ...prev,
          isPending: false,
          isConfirming: false,
          isConfirmed: true,
          txHash: mockTxHash,
        }));

        message.success("流动性添加成功！");
        setShowConfirmModal(false);

        if (onTransactionComplete) {
          onTransactionComplete(mockTxHash);
        }
      }
    } catch (error) {
      setTransactionStatus((prev) => ({
        ...prev,
        isPending: false,
        isConfirming: false,
        error: error as Error,
      }));

      message.error("添加流动性失败：" + (error as Error).message);
    }
  }, [
    canAddLiquidity,
    token0,
    token1,
    token0Amount,
    token1Amount,
    onAddLiquidity,
    onTransactionComplete,
  ]);

  // 渲染按钮状态
  const renderButton = () => {
    if (!isConnected) {
      return (
        <Button
          type="primary"
          size="large"
          className="!w-full !h-12 !rounded-2xl !bg-blue-500 !border-blue-500 hover:!bg-blue-600 hover:!border-blue-600"
          disabled
        >
          请连接钱包
        </Button>
      );
    }

    if (!token0 || !token1) {
      return (
        <Button
          type="primary"
          size="large"
          className="!w-full !h-12 !rounded-2xl !bg-blue-500 !border-blue-500 hover:!bg-blue-600 hover:!border-blue-600"
          disabled
        >
          请选择代币对
        </Button>
      );
    }

    if (hasInsufficientBalance) {
      return (
        <Button
          type="primary"
          size="large"
          className="!w-full !h-12 !rounded-2xl !bg-red-500 !border-red-500 hover:!bg-red-600 hover:!border-red-600"
          disabled
        >
          余额不足
        </Button>
      );
    }

    if (
      !token0Amount ||
      !token1Amount ||
      parseFloat(token0Amount) === 0 ||
      parseFloat(token1Amount) === 0
    ) {
      return (
        <Button
          type="primary"
          size="large"
          className="!w-full !h-12 !rounded-2xl !bg-blue-500 !border-blue-500 hover:!bg-blue-600 hover:!border-blue-600"
          disabled
        >
          请输入数量
        </Button>
      );
    }

    if (transactionStatus.isPending) {
      return (
        <Button
          type="primary"
          size="large"
          className="!w-full !h-12 !rounded-2xl !bg-blue-500 !border-blue-500"
          disabled
          icon={<LoadingOutlined />}
        >
          添加中...
        </Button>
      );
    }

    if (transactionStatus.isConfirming) {
      return (
        <Button
          type="primary"
          size="large"
          className="!w-full !h-12 !rounded-2xl !bg-orange-500 !border-orange-500"
          disabled
          icon={<LoadingOutlined />}
        >
          等待确认中...
        </Button>
      );
    }

    return (
      <Button
        type="primary"
        size="large"
        className="!w-full !h-12 !rounded-2xl !bg-blue-500 !border-blue-500 hover:!bg-blue-600 hover:!border-blue-600 !font-semibold"
        onClick={() => setShowConfirmModal(true)}
      >
        添加流动性
      </Button>
    );
  };

  return (
    <div className={className}>
      {renderButton()}

      {/* 确认模态框 */}
      <Modal
        title="确认添加流动性"
        open={showConfirmModal}
        onOk={handleAddLiquidity}
        onCancel={() => setShowConfirmModal(false)}
        okText="确认"
        cancelText="取消"
        confirmLoading={transactionStatus.isPending}
        width={480}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl">
            <Text className="text-gray-600 text-sm">您将添加:</Text>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <Text className="font-medium">
                  {token0Amount} {token0?.tokenSymbol}
                </Text>
                <Text className="text-gray-500">≈ ${token0Amount}</Text>
              </div>
              <div className="flex justify-between">
                <Text className="font-medium">
                  {token1Amount} {token1?.tokenSymbol}
                </Text>
                <Text className="text-gray-500">≈ ${token1Amount}</Text>
              </div>
            </div>
          </div>

          {poolInfo && (
            <div className="bg-blue-50 p-4 rounded-xl">
              <Text className="text-blue-700 text-sm">
                您将获得池子份额的 {poolInfo.sharePercentage.toFixed(2)}%
              </Text>
            </div>
          )}

          <div className="flex items-center gap-2 text-orange-600">
            <ExclamationCircleOutlined />
            <Text className="text-sm">
              请确保您已了解风险，添加流动性后您的代币将被锁定。
            </Text>
          </div>
        </div>
      </Modal>

      {/* 交易状态提示 */}
      {transactionStatus.txHash && (
        <div className="mt-4 p-3 bg-green-50 rounded-xl">
          <Text className="text-green-700 text-sm">
            交易已提交！Hash: {transactionStatus.txHash.slice(0, 10)}...
            {transactionStatus.txHash.slice(-8)}
          </Text>
        </div>
      )}

      {transactionStatus.error && (
        <div className="mt-4 p-3 bg-red-50 rounded-xl">
          <Text className="text-red-700 text-sm">
            错误: {transactionStatus.error.message}
          </Text>
        </div>
      )}
    </div>
  );
};

export default AddLiquidityButton;
