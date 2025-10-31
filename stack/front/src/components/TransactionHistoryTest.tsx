/**
 * 交易历史测试组件
 *
 * 用于测试 useStakeExchangeHistory Hook 的功能
 *
 * @author Hoyn
 * @version 1.0.0
 * @lastModified 2025-10-31
 */

"use client";

import React from "react";
import { Button, Card, List, Tag, Spin, Alert, Typography, Divider } from "antd";
import { useStakeExchangeHistory } from "@/hooks/useStakeExchangeHistory";
import { TransactionType, TransactionStatus } from "@/types/TransactionHistory";
import { formatEther, formatUnits } from "viem";

const { Text, Title } = Typography;

/**
 * 交易类型颜色映射
 */
const TYPE_COLORS: Record<TransactionType, string> = {
  'Stake': 'green',
  'Unstake': 'orange',
  'Withdraw': 'blue',
  'ClaimRewards': 'purple'
};

/**
 * 交易状态颜色映射
 */
const STATUS_COLORS: Record<TransactionStatus, string> = {
  'Success': 'success',
  'Failed': 'error',
  'Pending': 'warning'
};

/**
 * 交易历史测试组件
 */
export function TransactionHistoryTest(): React.ReactNode {
  const {
    transactions,
    stats,
    isLoading,
    isRefreshing,
    error,
    fetchTransactionHistory,
    refreshTransactionHistory,
    filterByType,
    filterByStatus
  } = useStakeExchangeHistory();

  // 测试功能
  const testFetchHistory = async () => {
    try {
      await fetchTransactionHistory();
    } catch (err) {
      console.error("测试获取交易历史失败:", err);
    }
  };

  const testFilterByType = (type: TransactionType) => {
    const filtered = filterByType([type]);
    console.log(`过滤 ${type} 类型交易:`, filtered);
  };

  const testFilterByStatus = (status: TransactionStatus) => {
    const filtered = filterByStatus([status]);
    console.log(`过滤 ${status} 状态交易:`, filtered);
  };

  const formatAmount = (amount: bigint | undefined, tokenSymbol?: string): string => {
    if (!amount) return 'N/A';

    if (tokenSymbol === 'USDC') {
      return formatUnits(amount, 6);
    } else {
      return formatEther(amount);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>交易历史功能测试</Title>

      {/* 错误提示 */}
      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 统计信息 */}
      {stats && (
        <Card title="统计信息" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <Text strong>总交易数:</Text> {stats.totalTransactions}
            </div>
            <div>
              <Text strong>成功交易:</Text> {stats.successfulTransactions}
            </div>
            <div>
              <Text strong>失败交易:</Text> {stats.failedTransactions}
            </div>
            <div>
              <Text strong>待处理交易:</Text> {stats.pendingTransactions}
            </div>
            <div>
              <Text strong>总质押金额:</Text> {formatEther(stats.totalStaked)} ETH
            </div>
            <div>
              <Text strong>总解质押金额:</Text> {formatEther(stats.totalUnstaked)} ETH
            </div>
            <div>
              <Text strong>总奖励领取:</Text> {formatEther(stats.totalClaimed)} ETH
            </div>
            {stats.mostActivePoolId !== undefined && (
              <div>
                <Text strong>最活跃池子:</Text> #{stats.mostActivePoolId}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 测试按钮 */}
      <Card title="测试功能" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <Button
            type="primary"
            onClick={testFetchHistory}
            loading={isLoading}
          >
            获取交易历史
          </Button>
          <Button
            onClick={refreshTransactionHistory}
            loading={isRefreshing}
          >
            刷新交易历史
          </Button>
        </div>

        <Divider>类型过滤测试</Divider>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {Object.values(TransactionType).map(type => (
            <Button
              key={type}
              onClick={() => testFilterByType(type)}
              size="small"
            >
              过滤 {type}
            </Button>
          ))}
        </div>

        <Divider>状态过滤测试</Divider>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.values(TransactionStatus).map(status => (
            <Button
              key={status}
              onClick={() => testFilterByStatus(status)}
              size="small"
            >
              过滤 {status}
            </Button>
          ))}
        </div>
      </Card>

      {/* 交易历史列表 */}
      <Card
        title={`交易历史 (${transactions.length} 条记录)`}
        extra={
          <Spin spinning={isLoading || isRefreshing} />
        }
      >
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text type="secondary">暂无交易历史记录</Text>
          </div>
        ) : (
          <List
            dataSource={transactions}
            renderItem={(transaction) => (
              <List.Item>
                <Card size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <Tag color={TYPE_COLORS[transaction.type]}>
                        {transaction.type}
                      </Tag>
                      <Tag color={STATUS_COLORS[transaction.status]}>
                        {transaction.status}
                      </Tag>
                      {transaction.poolId !== undefined && (
                        <Tag>池子 #{transaction.poolId}</Tag>
                      )}
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatTimestamp(transaction.timestamp)}
                    </Text>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '14px' }}>
                    <div>
                      <Text type="secondary">交易哈希:</Text><br/>
                      <Text code style={{ fontSize: '12px' }}>
                        {transaction.transactionHash.slice(0, 10)}...{transaction.transactionHash.slice(-8)}
                      </Text>
                    </div>

                    <div>
                      <Text type="secondary">金额:</Text><br/>
                      <Text strong>
                        {formatAmount(transaction.amount, transaction.tokenSymbol)} {transaction.tokenSymbol}
                      </Text>
                    </div>

                    {transaction.rewardAmount && (
                      <div>
                        <Text type="secondary">奖励:</Text><br/>
                        <Text strong style={{ color: '#52c41a' }}>
                          {formatEther(transaction.rewardAmount)} MTK
                        </Text>
                      </div>
                    )}

                    <div>
                      <Text type="secondary">区块:</Text><br/>
                      <Text>{Number(transaction.blockNumber).toLocaleString()}</Text>
                    </div>

                    <div>
                      <Text type="secondary">确认数:</Text><br/>
                      <Text>{transaction.confirmations}</Text>
                    </div>

                    {transaction.unlockBlock && (
                      <div>
                        <Text type="secondary">解锁区块:</Text><br/>
                        <Text>{Number(transaction.unlockBlock).toLocaleString()}</Text>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      事件: {transaction.eventName} |
                      合约: {transaction.contractAddress.slice(0, 10)}...{transaction.contractAddress.slice(-8)}
                    </Text>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}