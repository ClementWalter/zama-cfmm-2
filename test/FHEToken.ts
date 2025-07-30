import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FHEToken, FHEToken__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEToken")) as FHEToken__factory;
  const fheTokenContract = (await factory.deploy("FHE Token", "FHET")) as FHEToken;
  const fheTokenContractAddress = await fheTokenContract.getAddress();

  return { fheTokenContract, fheTokenContractAddress };
}

describe("FHEToken", function () {
  let signers: Signers;
  let fheTokenContract: FHEToken;
  let fheTokenContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ fheTokenContract, fheTokenContractAddress } = await deployFixture());
  });

  it("should mint tokens to an address", async function () {
    const mintAmount = 1000;
    const recipient = signers.alice.address;

    // Create encrypted input for mint amount
    const encryptedMintAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(mintAmount)
      .encrypt();

    // Mint tokens
    const tx = await fheTokenContract
      .connect(signers.deployer)
      .mint(recipient, encryptedMintAmount.handles[0], encryptedMintAmount.inputProof);
    await tx.wait();

    // Check balance
    const encryptedBalance = await fheTokenContract.confidentialBalanceOf(recipient);
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      fheTokenContractAddress,
      signers.alice,
    );

    expect(decryptedBalance).to.eq(mintAmount);
  });

  it("should burn tokens from an address", async function () {
    const mintAmount = 5000;
    const burnAmount = 2000;
    const owner = signers.alice.address;

    // First mint tokens to the owner
    const encryptedMintAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(mintAmount)
      .encrypt();

    let tx = await fheTokenContract
      .connect(signers.deployer)
      .mint(owner, encryptedMintAmount.handles[0], encryptedMintAmount.inputProof);
    await tx.wait();

    // Create encrypted input for burn amount
    const encryptedBurnAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(burnAmount)
      .encrypt();

    // Burn tokens
    tx = await fheTokenContract
      .connect(signers.deployer)
      .burn(owner, encryptedBurnAmount.handles[0], encryptedBurnAmount.inputProof);
    await tx.wait();

    // Check remaining balance
    const encryptedBalance = await fheTokenContract.confidentialBalanceOf(owner);
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      fheTokenContractAddress,
      signers.alice,
    );

    expect(decryptedBalance).to.eq(mintAmount - burnAmount);
  });

  it("should handle multiple mints to the same address", async function () {
    const firstMint = 1000;
    const secondMint = 2000;
    const thirdMint = 500;
    const recipient = signers.bob.address;

    // First mint
    let encryptedAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(firstMint)
      .encrypt();

    let tx = await fheTokenContract
      .connect(signers.deployer)
      .mint(recipient, encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();

    // Second mint
    encryptedAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(secondMint)
      .encrypt();

    tx = await fheTokenContract
      .connect(signers.deployer)
      .mint(recipient, encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();

    // Third mint
    encryptedAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(thirdMint)
      .encrypt();

    tx = await fheTokenContract
      .connect(signers.deployer)
      .mint(recipient, encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();

    // Check total balance
    const encryptedBalance = await fheTokenContract.confidentialBalanceOf(recipient);
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      fheTokenContractAddress,
      signers.bob,
    );

    expect(decryptedBalance).to.eq(firstMint + secondMint + thirdMint);
  });

  it("should mint and burn entire balance", async function () {
    const mintAmount = 10000;
    const owner = signers.alice.address;

    // Mint tokens
    const encryptedMintAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(mintAmount)
      .encrypt();

    let tx = await fheTokenContract
      .connect(signers.deployer)
      .mint(owner, encryptedMintAmount.handles[0], encryptedMintAmount.inputProof);
    await tx.wait();

    // Burn entire balance
    const encryptedBurnAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(mintAmount)
      .encrypt();

    tx = await fheTokenContract
      .connect(signers.deployer)
      .burn(owner, encryptedBurnAmount.handles[0], encryptedBurnAmount.inputProof);
    await tx.wait();

    // Check balance is zero
    const encryptedBalance = await fheTokenContract.confidentialBalanceOf(owner);
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      fheTokenContractAddress,
      signers.alice,
    );

    expect(decryptedBalance).to.eq(0);
  });

  it("should handle minting to multiple addresses", async function () {
    const aliceAmount = 3000;
    const bobAmount = 4000;

    // Mint to Alice
    let encryptedAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(aliceAmount)
      .encrypt();

    let tx = await fheTokenContract
      .connect(signers.deployer)
      .mint(signers.alice.address, encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();

    // Mint to Bob
    encryptedAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(bobAmount)
      .encrypt();

    tx = await fheTokenContract
      .connect(signers.deployer)
      .mint(signers.bob.address, encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();

    // Check Alice's balance
    let encryptedBalance = await fheTokenContract.confidentialBalanceOf(signers.alice.address);
    let decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      fheTokenContractAddress,
      signers.alice,
    );
    expect(decryptedBalance).to.eq(aliceAmount);

    // Check Bob's balance
    encryptedBalance = await fheTokenContract.confidentialBalanceOf(signers.bob.address);
    decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      fheTokenContractAddress,
      signers.bob,
    );
    expect(decryptedBalance).to.eq(bobAmount);
  });

  it("should handle partial burns", async function () {
    const mintAmount = 10000;
    const firstBurn = 2000;
    const secondBurn = 3000;
    const owner = signers.alice.address;

    // Mint initial tokens
    const encryptedMintAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(mintAmount)
      .encrypt();

    let tx = await fheTokenContract
      .connect(signers.deployer)
      .mint(owner, encryptedMintAmount.handles[0], encryptedMintAmount.inputProof);
    await tx.wait();

    // First burn
    let encryptedBurnAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(firstBurn)
      .encrypt();

    tx = await fheTokenContract
      .connect(signers.deployer)
      .burn(owner, encryptedBurnAmount.handles[0], encryptedBurnAmount.inputProof);
    await tx.wait();

    // Second burn
    encryptedBurnAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(secondBurn)
      .encrypt();

    tx = await fheTokenContract
      .connect(signers.deployer)
      .burn(owner, encryptedBurnAmount.handles[0], encryptedBurnAmount.inputProof);
    await tx.wait();

    // Check remaining balance
    const encryptedBalance = await fheTokenContract.confidentialBalanceOf(owner);
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      fheTokenContractAddress,
      signers.alice,
    );

    expect(decryptedBalance).to.eq(mintAmount - firstBurn - secondBurn);
  });

  it("should mint zero tokens", async function () {
    const mintAmount = 0;
    const recipient = signers.alice.address;

    // Create encrypted input for zero amount
    const encryptedMintAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(mintAmount)
      .encrypt();

    // Mint zero tokens
    const tx = await fheTokenContract
      .connect(signers.deployer)
      .mint(recipient, encryptedMintAmount.handles[0], encryptedMintAmount.inputProof);
    await tx.wait();

    // Check balance remains zero
    const encryptedBalance = await fheTokenContract.confidentialBalanceOf(recipient);
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      fheTokenContractAddress,
      signers.alice,
    );

    expect(decryptedBalance).to.eq(0);
  });

  it("should burn zero tokens", async function () {
    const mintAmount = 1000;
    const burnAmount = 0;
    const owner = signers.alice.address;

    // First mint tokens
    const encryptedMintAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(mintAmount)
      .encrypt();

    let tx = await fheTokenContract
      .connect(signers.deployer)
      .mint(owner, encryptedMintAmount.handles[0], encryptedMintAmount.inputProof);
    await tx.wait();

    // Burn zero tokens
    const encryptedBurnAmount = await fhevm
      .createEncryptedInput(fheTokenContractAddress, signers.deployer.address)
      .add64(burnAmount)
      .encrypt();

    tx = await fheTokenContract
      .connect(signers.deployer)
      .burn(owner, encryptedBurnAmount.handles[0], encryptedBurnAmount.inputProof);
    await tx.wait();

    // Check balance remains unchanged
    const encryptedBalance = await fheTokenContract.confidentialBalanceOf(owner);
    const decryptedBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      fheTokenContractAddress,
      signers.alice,
    );

    expect(decryptedBalance).to.eq(mintAmount);
  });
});
