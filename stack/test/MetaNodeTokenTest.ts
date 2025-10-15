import { expect } from "chai";
import { ethers } from "hardhat";
import { MetaNodeToken } from "../typechain-types/contracts/MetaNodeToken";
import { MetaNodeTokenV2 } from "../typechain-types/contracts/MetaNodeTokenV2";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { token } from "../typechain-types/@openzeppelin/contracts";
import { assert } from "console";

describe("MetaNodeToken", () => {
  let deployer: SignerWithAddress;
  let recipient: SignerWithAddress;
  let metaNodeTokenProxy: MetaNodeToken;

  let developerAddress: string;
  let recipientAddress: string;
  let tokenAddress: string;

  let proxyAddress: string;

  beforeEach(async () => {
    console.log("-----------------------------------------------------------");
    // Get signers
    [deployer, recipient] = await ethers.getSigners();

    // Deploy the implementation contract
    const MetaNodeToken = await ethers.getContractFactory(
      "contracts/MetaNodeToken.sol:MetaNodeToken"
    );
    const implementation = await MetaNodeToken.deploy();
    await implementation.waitForDeployment();

    const impAddress = await implementation.getAddress();
    console.log("MetaNodeToken implementation deployed to:", impAddress);

    // Deploy the proxy contract
    const Proxy = await ethers.getContractFactory("ProxyContract");
    // empty calldata for now
    const proxy = await Proxy.deploy(impAddress, "0x");
    await proxy.waitForDeployment();
    proxyAddress = await proxy.getAddress();
    console.log("Proxy deployed to:", proxyAddress);

    // Attach the MetaNodeToken interface to the proxy
    metaNodeTokenProxy = MetaNodeToken.attach(
      await proxy.getAddress()
    ) as MetaNodeToken;

    // Initialize the contract through the proxy
    await metaNodeTokenProxy.initialize();
    console.log("✓ Contract initialized through proxy");

    developerAddress = await deployer.getAddress();
    recipientAddress = await recipient.getAddress();
    tokenAddress = await metaNodeTokenProxy.getAddress();

    console.log("deployer address:", developerAddress);
    console.log("recipient address:", recipientAddress);
    console.log("token address:", tokenAddress);

    console.log("-----------------------------------------------------------");
  });

  it("should deploy MetaNodeToken contract with proxy and test mint", async () => {
    // Check version
    const version = await metaNodeTokenProxy.getTokenVersion();
    console.log("MetaNodeToken version:", version);
    expect(version).to.equal(1);

    // Verify the deployment was successful
    expect(await metaNodeTokenProxy.getAddress()).to.not.be.empty;
    console.log(
      "✓ MetaNodeToken proxy contract deployed and initialized successfully",
      await metaNodeTokenProxy.getAddress()
    );

    // 项目方自己铸造50000个币
    const mintTx1 = await metaNodeTokenProxy.mint(
      await deployer.getAddress(),
      ethers.parseEther("50000")
    );
    console.log("✓ Mint transaction successful");

    // 给用户铸造1000个币
    const mintTx = await metaNodeTokenProxy.mint(
      await recipient.getAddress(),
      ethers.parseEther("1000")
    );
    console.log("✓ Mint transaction successful");

    const balance = await metaNodeTokenProxy.balanceOf(
      await recipient.getAddress()
    );
    console.log("Balance of recipient:", ethers.formatEther(balance), "tokens");
    expect(balance).to.equal(ethers.parseEther("1000"));

    // Also check initial supply was minted to deployer
    const deployerBalance = await metaNodeTokenProxy.balanceOf(
      await deployer.getAddress()
    );
    console.log(
      "Deployer balance (initial supply):",
      ethers.formatEther(deployerBalance),
      "tokens"
    );
    expect(deployerBalance).to.equal(ethers.parseEther("1050000")); // INITIAL_SUPPLY

    const totalMintedSupply = await metaNodeTokenProxy.getTotalMintedSupply();
    console.log(
      "Total minted supply:",
      ethers.formatEther(totalMintedSupply),
      "tokens"
    );
  });
  it("测试打错币到TOKEN地址是否能恢复", async () => {
    const developerAddress = await deployer.getAddress();
    const recipientAddress = await recipient.getAddress();
    const tokenAddress = await metaNodeTokenProxy.getAddress();

    const initDeveloperBalance = await metaNodeTokenProxy.balanceOf(
      developerAddress
    );

    //给用户铸造10w个币
    await metaNodeTokenProxy.mint(
      recipientAddress,
      ethers.parseEther("100000")
    );
    console.log(
      "初始，项目方余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(developerAddress))
    );
    console.log(
      "初始，用户余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(recipientAddress))
    );
    console.log(
      "初始，TOKEN合约地址余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(tokenAddress))
    );

    //用户转账给TokenAddress 5w个币
    await metaNodeTokenProxy
      .connect(recipient)
      .transfer(tokenAddress, ethers.parseEther("50000"));
    console.log("-----------------------------------------------------------");
    console.log(
      "打错币后，项目方余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(developerAddress))
    );
    console.log(
      "打错币后，用户余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(recipientAddress))
    );
    console.log(
      "打错币后，TOKEN合约地址余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(tokenAddress))
    );

    //项目方把币从TokenAddress恢复回来
    await metaNodeTokenProxy.recoverERC20(
      tokenAddress,
      ethers.parseEther("100")
    );

    console.log("-----------------------------------------------------------");
    console.log(
      "恢复币后，项目方余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(developerAddress))
    );
    console.log(
      "恢复币后，用户余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(recipientAddress))
    );
    console.log(
      "恢复币后，TOKEN合约地址余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(tokenAddress))
    );

    console.log("-----------------------------------------------------------");
    assert(
      (await metaNodeTokenProxy.balanceOf(developerAddress)) ==
        initDeveloperBalance + ethers.parseEther("100"),
      "项目方余额未恢复正确"
    );
  });
  it("测试黑名单", async () => {
    console.log("给用户铸造10000个币");
    await metaNodeTokenProxy.mint(recipientAddress, ethers.parseEther("10000"));

    console.log(
      "用户余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(recipientAddress)),
      "tokens"
    );
    console.log("已将用户加入黑名单");
    await metaNodeTokenProxy.connect(deployer).addToBlacklist(recipientAddress);

    console.log(
      "黑名单用户余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(recipientAddress)),
      "tokens"
    );
    console.log("给用户加入黑名单后,再给他铸造10000个币");
    await metaNodeTokenProxy
      .mint(recipientAddress, ethers.parseEther("10000"))
      .catch((error) => {
        console.log("给黑名单用户铸造失败，错误信息:", error.message);
      });
    console.log("给用户加入黑名单后,项目方给黑名单用户转账5000个币");
    await metaNodeTokenProxy
      .connect(deployer)
      .transfer(recipientAddress, ethers.parseEther("5000"))
      .catch((error) => {
        console.log("给黑名单用户转账失败，错误信息:", error.message);
      });
    console.log(
      "黑名单用户余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(recipientAddress)),
      "tokens"
    );
    await metaNodeTokenProxy
      .connect(recipient)
      .transfer(deployer.getAddress(), ethers.parseEther("10"))
      .catch((error) => {
        console.log("黑名单用户转账失败，错误信息:", error.message);
      });
    //断言转账失败,用户只有初始余额10000
    const balance = await metaNodeTokenProxy.balanceOf(recipientAddress);
    expect(balance).to.equal(ethers.parseEther("10000"));
    console.log("黑名单用户余额:", ethers.formatEther(balance), "tokens");

    console.log(
      "项目方余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(developerAddress))
    );
    console.log(
      "用户余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(recipientAddress))
    );
    console.log(
      "TOKEN合约地址余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(tokenAddress))
    );
  });
  it("测试暂停功能", async () => {
    console.log("给用户铸造10000个币");
    await metaNodeTokenProxy.mint(recipientAddress, ethers.parseEther("10000"));
    console.log(
      "用户余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(recipientAddress)),
      "tokens"
    );
    //项目方给用户转账5000个币
    await metaNodeTokenProxy
      .connect(deployer)
      .transfer(recipientAddress, ethers.parseEther("5000"));
    console.log(
      "用户余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(recipientAddress)),
      "tokens"
    );
    //项目方暂停合约
    await metaNodeTokenProxy.connect(deployer).pause();
    console.log("合约已暂停，项目方给用户转账5000个币");
    await metaNodeTokenProxy
      .connect(deployer)
      .transfer(recipientAddress, ethers.parseEther("5000"))
      .catch((error) => {
        console.log("合约暂停后，给用户转账失败，错误信息:", error.message);
      });
    //项目方恢复合约
    await metaNodeTokenProxy.connect(deployer).unpause();
    console.log("合约已恢复，项目方给用户转账5000个币");
    await metaNodeTokenProxy
      .connect(deployer)
      .transfer(recipientAddress, ethers.parseEther("5000"))
      .catch((error) => {
        console.log("合约恢复后，给用户转账失败，错误信息:", error.message);
      });
    console.log(
      "用户余额:",
      ethers.formatEther(await metaNodeTokenProxy.balanceOf(recipientAddress)),
      "tokens"
    );
    assert(
      (await metaNodeTokenProxy.balanceOf(recipientAddress)) ==
        ethers.parseEther("20000"),
      "用户余额不正确"
    );
  });
  it("测试升级", async () => {
    const MetaNodeTokenV2 = await ethers.getContractFactory(
      "contracts/MetaNodeTokenV2.sol:MetaNodeTokenV2"
    );
    const implementationV2 = await MetaNodeTokenV2.deploy();
    await implementationV2.waitForDeployment();
    const impV2Address = await implementationV2.getAddress();
    console.log("MetaNodeTokenV2 implementation deployed to:", impV2Address);

    const developer = await ethers.getSigner(developerAddress);
    console.log("旧 Developer address:", developerAddress);
    console.log("Developer address:", await developer.getAddress());

    // 实际执行升级操作 - 通过原来的V1代理调用upgradeToAndCall
    await metaNodeTokenProxy
      .connect(deployer)
      .upgradeToAndCall(impV2Address, "0x");

    // 现在将V2接口附加到代理地址
    const metaNodeTokenV2Proxy = MetaNodeTokenV2.attach(
      proxyAddress
    ) as MetaNodeTokenV2;

    console.log("✓ Proxy upgraded to MetaNodeTokenV2");

    const version = Number(await metaNodeTokenV2Proxy.getTokenVersion());
    console.log("新合约版本号:", version);

    assert(version === 2, "版本号不正确");
    console.log("测试升级后新功能，给用户铸造10000个币");
    await metaNodeTokenV2Proxy.mint(
      recipientAddress,
      ethers.parseEther("10000")
    );
    console.log(
      "用户余额:",
      ethers.formatEther(
        await metaNodeTokenV2Proxy.balanceOf(recipientAddress)
      ),
      "tokens"
    );
    console.log("------------------------------------------------------------");
    console.log("测试升级后黑名单和暂停功能是否还在");
    console.log(
      "-------------------------------------------------------------"
    );

    console.log("给用户铸造10000个币");
    await metaNodeTokenV2Proxy.mint(
      recipientAddress,
      ethers.parseEther("10000")
    );
    console.log(
      "用户余额:",
      ethers.formatEther(
        await metaNodeTokenV2Proxy.balanceOf(recipientAddress)
      ),
      "tokens"
    );
    console.log("已将用户加入黑名单");
    await metaNodeTokenV2Proxy
      .connect(deployer)
      .addToBlacklist(recipientAddress);
    console.log("给用户加入黑名单后,再给他铸造10000个币");
    await metaNodeTokenV2Proxy
      .mint(recipientAddress, ethers.parseEther("10000"))
      .catch((error) => {
        console.log("给黑名单用户铸造失败，错误信息:", error.message);
      });

    console.log(await metaNodeTokenV2Proxy.getTokenVersion());

    console.log(
      "测试开发者账户余额是否被多次initialize影响",
      ethers.formatEther(
        await metaNodeTokenV2Proxy.balanceOf(deployer.getAddress())
      )
    );

    await metaNodeTokenV2Proxy.initialize().catch((error) => {
      console.log("再次调用initialize失败，错误信息:", error.message);
    });
    console.log("✓ Contract initialized through proxy");
    console.log(
      "测试开发者账户余额是否被多次initialize影响",
      ethers.formatEther(
        await metaNodeTokenV2Proxy.balanceOf(deployer.getAddress())
      )
    );
    assert(
      (await metaNodeTokenV2Proxy.balanceOf(deployer.getAddress())) ==
        ethers.parseEther("1000000"),
      "开发者余额不正确"
    );
  });
});
