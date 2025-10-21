import { useEffect } from "react";
import { useReadContract } from "wagmi";
import contract from ".././app/abi/MultiStakePledgeContract.json";
export function useContractVersion(): React.ReactNode {
  const {
    data: version,
    error,
    isError,
    isLoading,
  } = useReadContract({
    abi: contract.abi,
    address: contract.address as `0x${string}`,
    functionName: "getVersion",
    args: [],
    query: {
      enabled: !!contract.address, // 确保有合约地址才执行
    },
  });

  useEffect(() => {
    console.log("=== Contract Version Debug ===");
    console.log("Contract Address:", contract.address);
    console.log("Version Data:", version);
    console.log("Is Loading:", isLoading);
    console.log("Is Error:", isError);
    if (isError) {
      console.error("Version Error:", error);
    }
    console.log("===============================");
  }, [version, isError, error, isLoading]);

  if (isLoading) return "加载中...";
  if (isError) {
    console.error("Failed to get version:", error);
    return "获取版本失败";
  }

  return `v${version || "未知"}`;
}