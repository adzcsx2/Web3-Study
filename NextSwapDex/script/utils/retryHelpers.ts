/**
 * 重试辅助工具函数
 * 用于处理网络不稳定、外部合约调用失败等情况
 */

// 添加延迟函数,避免请求过快
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 检查是否是网络相关错误
export function isNetworkError(error: any): boolean {
  const networkErrorCodes = [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "NETWORK_ERROR",
  ];
  const networkErrorMessages = [
    "network socket disconnected",
    "TLS connection",
    "timeout",
    "network error",
    "connection refused",
  ];

  if (error.code && networkErrorCodes.includes(error.code)) {
    return true;
  }

  const errorMsg = error.message?.toLowerCase() || "";
  return networkErrorMessages.some((msg) => errorMsg.includes(msg));
}

/**
 * 带重试的交易执行函数
 * @param txFunction 交易执行函数
 * @param name 操作名称
 * @param maxRetries 最大重试次数
 * @param initialDelay 初始延迟时间(毫秒)
 * @returns 交易收据
 */
export async function executeTransactionWithRetry(
  txFunction: () => Promise<any>,
  name: string,
  maxRetries = 5,
  initialDelay = 5000
): Promise<any> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`\n🔄 Executing ${name} (attempt ${i + 1}/${maxRetries})...`);

      const tx = await txFunction();
      console.log(`⏳ Waiting for transaction confirmation...`);
      console.log(`Transaction hash: ${tx.hash}`);

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log(`✅ ${name} executed successfully!`);
        return receipt;
      } else {
        throw new Error(`Transaction failed with status ${receipt.status}`);
      }
    } catch (error: any) {
      lastError = error;
      const isNetwork = isNetworkError(error);

      console.log(`❌ ${name} attempt ${i + 1} failed`);
      console.log(
        `Error type: ${isNetwork ? "NETWORK ERROR" : "TRANSACTION ERROR"}`
      );
      console.log(`Error code: ${error.code || "UNKNOWN"}`);
      console.log(`Error message: ${error.message}`);

      if (i < maxRetries - 1) {
        const waitTime = isNetwork ? initialDelay : (i + 1) * 3000;
        console.log(
          `⏱️  ${isNetwork ? "Network issue detected." : ""} Retrying in ${
            waitTime / 1000
          } seconds...`
        );
        await delay(waitTime);
        console.log(`🔁 Resuming ${name}...`);
      } else {
        console.log(`\n❌ All ${maxRetries} attempts failed for ${name}`);
      }
    }
  }

  throw lastError;
}

/**
 * 带重试的外部合约调用函数 (需要更长的等待时间)
 * @param operation 操作函数
 * @param operationName 操作名称
 * @param maxRetries 最大重试次数
 * @returns 操作结果
 */
export async function retryExternalCall<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 5
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isNetwork = isNetworkError(error);

      if (i < maxRetries - 1) {
        const waitTime = isNetwork ? 8000 : 5000; // 外部调用需要更长等待
        console.log(
          `⚠️  ${operationName} failed (${
            isNetwork ? "Network error" : "External call error"
          }), retrying in ${waitTime / 1000}s... (${i + 1}/${maxRetries})`
        );
        await delay(waitTime);
      }
    }
  }

  console.log(`❌ ${operationName} failed after ${maxRetries} attempts`);
  throw lastError;
}

/**
 * 带重试的通用异步操作函数
 * @param operation 操作函数
 * @param operationName 操作名称
 * @param maxRetries 最大重试次数
 * @returns 操作结果
 */
export async function retryAsyncOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isNetwork = isNetworkError(error);

      if (i < maxRetries - 1) {
        const waitTime = isNetwork ? 5000 : 3000;
        console.log(
          `⚠️  ${operationName} failed (${
            isNetwork ? "Network error" : "Error"
          }), retrying in ${waitTime / 1000}s... (${i + 1}/${maxRetries})`
        );
        await delay(waitTime);
      }
    }
  }

  console.log(`❌ ${operationName} failed after ${maxRetries} attempts`);
  throw lastError;
}

/**
 * 带重试的部署函数
 * @param factory 合约工厂
 * @param name 合约名称
 * @param maxRetries 最大重试次数
 * @returns 已部署的合约实例
 */
export async function deployWithRetry(
  factory: any,
  name: string,
  maxRetries = 5
): Promise<any> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`\n🔄 Deploying ${name} (attempt ${i + 1}/${maxRetries})...`);

      let contract;
      try {
        contract = await factory.deploy();
      } catch (deployError: any) {
        throw deployError;
      }

      console.log(`⏳ Waiting for deployment confirmation...`);

      try {
        await contract.waitForDeployment();
      } catch (waitError: any) {
        throw waitError;
      }

      const address = await contract.getAddress();
      console.log(`✅ ${name} deployed successfully: ${address}`);
      await delay(3000); // 部署后等待3秒
      return contract;
    } catch (error: any) {
      lastError = error;
      const isNetwork = isNetworkError(error);

      console.log(`❌ Deployment attempt ${i + 1} failed`);
      console.log(
        `Error type: ${isNetwork ? "NETWORK ERROR" : "DEPLOYMENT ERROR"}`
      );
      console.log(`Error code: ${error.code || "UNKNOWN"}`);
      console.log(`Error message: ${error.message}`);

      if (i < maxRetries - 1) {
        const waitTime = isNetwork ? 5000 : (i + 1) * 5000; // 网络错误固定5秒,其他错误递增
        console.log(
          `⏱️  ${isNetwork ? "Network issue detected." : ""} Retrying in ${
            waitTime / 1000
          } seconds...`
        );
        await delay(waitTime);
        console.log(`🔁 Resuming deployment...`);
      } else {
        console.log(
          `\n❌ All ${maxRetries} deployment attempts failed for ${name}`
        );
      }
    }
  }

  throw lastError;
}
