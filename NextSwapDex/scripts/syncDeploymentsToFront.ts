import { DeployHelper } from "./utils/DeployHelper";

async function main() {
  const deployHelper = new DeployHelper();
  deployHelper.syncDeploymentsToFrontend();
  console.log("✅ 同步部署信息到前端完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
