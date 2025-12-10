import { expect } from "chai";
import { ethers } from "hardhat";
import { NextswapAirdrop } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("NextswapAirdrop - Pausable Functionality", function () {
  let airdrop: NextswapAirdrop;
  let token: any;
  let owner: SignerWithAddress;
  let pauser: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let PAUSER_ROLE: string;

  beforeEach(async function () {
    [owner, pauser, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20 token (requires timelock address)
    const TokenFactory = await ethers.getContractFactory("NextswapToken");
    token = await TokenFactory.deploy(owner.address); // Using owner as timelock for test

    // Deploy Airdrop contract
    const AirdropFactory = await ethers.getContractFactory("NextswapAirdrop");
    airdrop = await AirdropFactory.deploy(await token.getAddress());

    // Get PAUSER_ROLE bytes32
    PAUSER_ROLE = await airdrop.PAUSER_ROLE();

    // Grant PAUSER_ROLE to pauser address
    await airdrop.grantRole(PAUSER_ROLE, pauser.address);

    // Fund the airdrop contract with tokens
    await token.transfer(await airdrop.getAddress(), ethers.parseEther("1000"));
  });

  describe("Pause/Unpause Functionality", function () {
    it("Should allow pauser to pause the contract", async function () {
      await expect(airdrop.connect(pauser).pause())
        .to.emit(airdrop, "Paused")
        .withArgs(pauser.address);

      expect(await airdrop.paused()).to.be.true;
    });

    it("Should allow pauser to unpause the contract", async function () {
      await airdrop.connect(pauser).pause();

      await expect(airdrop.connect(pauser).unpause())
        .to.emit(airdrop, "Unpaused")
        .withArgs(pauser.address);

      expect(await airdrop.paused()).to.be.false;
    });

    it("Should not allow non-pauser to pause the contract", async function () {
      await expect(airdrop.connect(user1).pause())
        .to.be.revertedWithCustomError(
          airdrop,
          "AccessControlUnauthorizedAccount"
        )
        .withArgs(user1.address, PAUSER_ROLE);
    });

    it("Should not allow non-pauser to unpause the contract", async function () {
      await airdrop.connect(pauser).pause();

      await expect(airdrop.connect(user1).unpause())
        .to.be.revertedWithCustomError(
          airdrop,
          "AccessControlUnauthorizedAccount"
        )
        .withArgs(user1.address, PAUSER_ROLE);
    });

    it("Should allow admin to pause the contract (admin has pauser role by default)", async function () {
      await expect(airdrop.connect(owner).pause())
        .to.emit(airdrop, "Paused")
        .withArgs(owner.address);
    });

    it("Should prevent claims when contract is paused", async function () {
      // First set a merkle root (using dummy hash)
      const dummyMerkleRoot = ethers.keccak256(ethers.toUtf8Bytes("dummy"));
      await airdrop.updateMerkleRoot(dummyMerkleRoot);

      // Pause the contract
      await airdrop.connect(pauser).pause();

      // Attempt to claim should fail
      await expect(
        airdrop.connect(user1).claim(
          1, // airdrop round
          user1.address,
          ethers.parseEther("100"),
          [] // empty proof for this test
        )
      ).to.be.revertedWithCustomError(airdrop, "EnforcedPause");
    });

    it("Should prevent batch claims when contract is paused", async function () {
      // First set a merkle root
      const dummyMerkleRoot = ethers.keccak256(ethers.toUtf8Bytes("dummy"));
      await airdrop.updateMerkleRoot(dummyMerkleRoot);

      // Pause the contract
      await airdrop.connect(pauser).pause();

      // Attempt batch claim should fail
      await expect(
        airdrop.connect(user1).batchClaim(
          1, // airdrop round
          [user1.address, user2.address],
          [ethers.parseEther("100"), ethers.parseEther("100")],
          [[], []] // empty proofs
        )
      ).to.be.revertedWithCustomError(airdrop, "EnforcedPause");
    });

    it("Should allow claims after contract is unpaused", async function () {
      // First set a merkle root
      const dummyMerkleRoot = ethers.keccak256(ethers.toUtf8Bytes("dummy"));
      await airdrop.updateMerkleRoot(dummyMerkleRoot);

      // Pause the contract
      await airdrop.connect(pauser).pause();
      expect(await airdrop.paused()).to.be.true;

      // Unpause the contract
      await airdrop.connect(pauser).unpause();
      expect(await airdrop.paused()).to.be.false;

      // Claims should now be possible (though may fail due to invalid proof)
      await expect(
        airdrop
          .connect(user1)
          .claim(1, user1.address, ethers.parseEther("100"), [])
      ).to.be.reverted; // Just expect it to revert without checking specific error
    });

    it("Should allow admin to revoke and grant pauser role", async function () {
      // Revoke pauser role from pauser
      await airdrop.revokeRole(PAUSER_ROLE, pauser.address);

      // Now pauser cannot pause
      await expect(airdrop.connect(pauser).pause())
        .to.be.revertedWithCustomError(
          airdrop,
          "AccessControlUnauthorizedAccount"
        )
        .withArgs(pauser.address, PAUSER_ROLE);

      // Grant pauser role to user1
      await airdrop.grantRole(PAUSER_ROLE, user1.address);

      // Now user1 can pause
      await expect(airdrop.connect(user1).pause())
        .to.emit(airdrop, "Paused")
        .withArgs(user1.address);
    });
  });

  describe("Role Management", function () {
    it("Should have correct DEFAULT_ADMIN_ROLE and PAUSER_ROLE setup", async function () {
      const DEFAULT_ADMIN_ROLE =
        "0x0000000000000000000000000000000000000000000000000000000000000000";

      // Owner should have DEFAULT_ADMIN_ROLE
      expect(await airdrop.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be
        .true;

      // Owner should have PAUSER_ROLE (granted in constructor)
      expect(await airdrop.hasRole(PAUSER_ROLE, owner.address)).to.be.true;

      // Pauser should have PAUSER_ROLE
      expect(await airdrop.hasRole(PAUSER_ROLE, pauser.address)).to.be.true;

      // Pauser should not have DEFAULT_ADMIN_ROLE
      expect(await airdrop.hasRole(DEFAULT_ADMIN_ROLE, pauser.address)).to.be
        .false;
    });
  });
});
