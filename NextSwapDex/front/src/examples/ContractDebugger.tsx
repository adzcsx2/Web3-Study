import React, { useState } from "react";
import {
  Card,
  Space,
  Typography,
  Button,
  Tag,
  Divider,
  Alert,
  Spin,
} from "antd";
import { useAccount } from "wagmi";
import { readContract } from "@wagmi/core";
import { config } from "@/config/wagmi";
import {
  getContractInfo,
  getLocalhostContracts,
} from "@/services/localhostContracts";

/**
 * 合约调试工具
 * 用于诊断本地测试网上的合约问题
 */
const ContractDebugger: React.FC = () => {
  const { chain, isConnected } = useAccount();
  const [debugging, setDebugging] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // 测试特定的合约地址
  const testContract = async (address: string) => {
    if (!chain) return;

    setDebugging(true);
    const result: any = {
      address,
      chainId: chain.id,
      timestamp: new Date().toISOString(),
      tests: [],
    };

    try {
      // 1. 检查部署信息
      const contractInfo = getContractInfo(chain.id, address);
      result.contractInfo = contractInfo;

      // 2. 使用部署ABI测试
      if (contractInfo) {
        const deployAbiTests = await testWithAbi(
          address,
          contractInfo.abi,
          "Deployed ABI"
        );
        result.tests.push(deployAbiTests);
      }

      // 3. 使用标准ERC20 ABI测试
      const erc20AbiTests = await testWithAbi(
        address,
        [
          {
            "constant": true,
            "inputs": [],
            "name": "name",
            "outputs": [{ "name": "", "type": "string" }],
            "type": "function",
          },
          {
            "constant": true,
            "inputs": [],
            "name": "symbol",
            "outputs": [{ "name": "", "type": "string" }],
            "type": "function",
          },
          {
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [{ "name": "", "type": "uint8" }],
            "type": "function",
          },
          {
            "constant": true,
            "inputs": [],
            "name": "totalSupply",
            "outputs": [{ "name": "", "type": "uint256" }],
            "type": "function",
          },
        ],
        "Standard ERC20 ABI"
      );
      result.tests.push(erc20AbiTests);

      setResults((prev) => [...prev, result]);
    } catch (error) {
      console.error("调试失败:", error);
      result.error = error instanceof Error ? error.message : String(error);
      setResults((prev) => [...prev, result]);
    } finally {
      setDebugging(false);
    }
  };

  const testWithAbi = async (address: string, abi: any[], abiName: string) => {
    const testResult: any = {
      abiName,
      abiLength: abi.length,
      methods: [],
    };

    const methodsToTest = ["name", "symbol", "decimals", "totalSupply"];

    for (const method of methodsToTest) {
      const methodResult: any = {
        method,
        success: false,
        value: null,
        error: null,
      };

      if (abi.some((item: any) => item.name === method)) {
        try {
          const value = await readContract(config, {
            address: address as `0x${string}`,
            abi,
            functionName: method,
            chainId: chain?.id as any,
            args: [], // 添加args参数
          });
          methodResult.success = true;
          methodResult.value = value;
          console.log(`${abiName} - ${method}:`, value);
        } catch (error: any) {
          methodResult.error = error.message;
          console.error(`${abiName} - ${method} 失败:`, error);
        }
      } else {
        methodResult.error = "Method not found in ABI";
      }

      testResult.methods.push(methodResult);
    }

    return testResult;
  };

  // 获取localhost链上的所有合约
  const localhostContracts = getLocalhostContracts();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Typography.Title level={2}>合约调试工具</Typography.Title>

      <Space direction="vertical" size="large" className="w-full">
        {/* 连接状态 */}
        <Card title="连接状态" size="small">
          {isConnected && chain ? (
            <Space>
              <Tag color="green">已连接</Tag>
              <Tag color="blue">{chain.name}</Tag>
              <Tag>Chain ID: {chain.id}</Tag>
            </Space>
          ) : (
            <Alert message="请先连接钱包" type="warning" />
          )}
        </Card>

        <Divider />

        {/* 本地已部署合约 */}
        {chain?.id === 1337 && (
          <Card title="本地已部署合约" size="small">
            <Space direction="vertical" className="w-full">
              {Object.entries(localhostContracts).map(([name, contract]) => (
                <div key={name} className="border p-3 rounded">
                  <Space direction="vertical" className="w-full">
                    <Space>
                      <Tag color="blue">{name}</Tag>
                      <Typography.Text code className="text-xs">
                        {contract.proxyAddress}
                      </Typography.Text>
                    </Space>
                    <Typography.Text type="secondary" className="text-xs">
                      ABI 方法数: {contract.abi.length}
                    </Typography.Text>
                    <Button
                      size="small"
                      onClick={() => testContract(contract.proxyAddress)}
                      loading={debugging}
                    >
                      调试此合约
                    </Button>
                  </Space>
                </div>
              ))}
            </Space>
          </Card>
        )}

        <Divider />

        {/* 手动测试合约 */}
        <Card title="手动测试合约地址" size="small">
          <Space direction="vertical" className="w-full">
            <Typography.Text>输入要测试的合约地址：</Typography.Text>
            <Space.Compact style={{ width: "100%" }}>
              <input
                id="manual-address"
                placeholder="0x..."
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  border: "1px solid #d9d9d9",
                  borderRadius: "6px",
                }}
              />
              <Button
                onClick={() => {
                  const input = document.getElementById(
                    "manual-address"
                  ) as HTMLInputElement;
                  if (input?.value) {
                    testContract(input.value);
                  }
                }}
                disabled={debugging || !isConnected}
              >
                测试
              </Button>
            </Space.Compact>
          </Space>
        </Card>

        <Divider />

        {/* 调试结果 */}
        {results.length > 0 && (
          <Card title="调试结果" size="small">
            <Space direction="vertical" className="w-full">
              {results.map((result, index) => (
                <div key={index} className="border p-3 rounded bg-gray-50">
                  <Space direction="vertical" className="w-full">
                    <Space>
                      <Typography.Text strong>地址:</Typography.Text>
                      <Typography.Text code className="text-xs">
                        {result.address}
                      </Typography.Text>
                      <Tag>Chain ID: {result.chainId}</Tag>
                    </Space>

                    {result.contractInfo && (
                      <div>
                        <Typography.Text strong>部署信息:</Typography.Text>
                        <div className="ml-4 text-sm">
                          <div>合约名: {result.contractInfo.contractName}</div>
                          <div>ABI长度: {result.contractInfo.abi.length}</div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Typography.Text strong>测试结果:</Typography.Text>
                      {result.tests.map((test: any, testIndex: number) => (
                        <div key={testIndex} className="ml-4 mb-2">
                          <Typography.Text className="text-sm">
                            {test.abiName} (ABI长度: {test.abiLength})
                          </Typography.Text>
                          <div className="ml-4">
                            {test.methods.map(
                              (method: any, methodIndex: number) => (
                                <div key={methodIndex} className="text-xs">
                                  <Space>
                                    <Tag
                                      color={method.success ? "green" : "red"}
                                    >
                                      {method.method}
                                    </Tag>
                                    {method.success ? (
                                      <span>: {String(method.value)}</span>
                                    ) : (
                                      <span className="text-red-500">
                                        : {method.error}
                                      </span>
                                    )}
                                  </Space>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {result.error && (
                      <Alert
                        message="错误"
                        description={result.error}
                        type="error"
                      />
                    )}
                  </Space>
                </div>
              ))}
            </Space>
          </Card>
        )}

        {/* 使用说明 */}
        <Card title="使用说明" size="small">
          <Space direction="vertical">
            <Typography.Text>1. 连接到 localhost 1337 网络</Typography.Text>
            <Typography.Text>2. 确保本地区块链节点正在运行</Typography.Text>
            <Typography.Text>
              3. 点击"调试此合约"测试已部署的合约
            </Typography.Text>
            <Typography.Text>4. 或手动输入合约地址进行测试</Typography.Text>
            <Typography.Text type="secondary" className="text-sm mt-2">
              💡 如果所有方法都失败，可能是合约未正确部署到当前网络
            </Typography.Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default ContractDebugger;
