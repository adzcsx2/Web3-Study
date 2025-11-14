const fs = require('fs');
const path = require('path');

const contractsToCopy = [
  'MyNFT',
  'MyNFTV2',
  'MetaNodeToken',
  'StackPledgeContract',
  'MultiStakePledgeContract'
];

const sourceDir = path.join(__dirname, '../../artifacts/contracts');
const targetDir = path.join(__dirname, '../../front/src/app/abi');

// 确保目标目录存在
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

contractsToCopy.forEach(contractName => {
  try {
    // 查找合约文件
    const contractFiles = findContractFiles(sourceDir, contractName);

    if (contractFiles.length > 0) {
      const contractFile = contractFiles[0];
      const artifact = JSON.parse(fs.readFileSync(contractFile, 'utf8'));

      // 创建简化的ABI文件
      const abiFile = {
        address: "", // 将在部署时填充
        abi: artifact.abi,
        contractName: contractName,
        bytecode: artifact.bytecode,
        deployedBytecode: artifact.deployedBytecode
      };

      const targetFile = path.join(targetDir, `${contractName}.json`);
      fs.writeFileSync(targetFile, JSON.stringify(abiFile, null, 2));

      console.log(`✅ 已复制 ${contractName} ABI 到前端`);
    } else {
      console.warn(`⚠️  未找到 ${contractName} 合约文件`);
    }
  } catch (error) {
    console.error(`❌ 复制 ${contractName} ABI 失败:`, error.message);
  }
});

function findContractFiles(dir, contractName) {
  const results = [];

  function search(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          search(fullPath);
        } else if (item === `${contractName}.json`) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略权限错误
    }
  }

  search(dir);
  return results;
}

console.log('🎉 ABI文件复制完成');
console.log(`📁 目标目录: ${targetDir}`);