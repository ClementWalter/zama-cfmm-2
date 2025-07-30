import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FHECSMM, FHECSMM__factory, FHEToken, FHEToken__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  // Deploy two FHEToken contracts
  const tokenFactory = (await ethers.getContractFactory("FHEToken")) as FHEToken__factory;
  const token0 = (await tokenFactory.deploy("Token A", "TKNA")) as FHEToken;
  const token1 = (await tokenFactory.deploy("Token B", "TKNB")) as FHEToken;

  const token0Address = await token0.getAddress();
  const token1Address = await token1.getAddress();

  // Deploy FHECSMM contract
  const csmmFactory = (await ethers.getContractFactory("FHECSMM")) as FHECSMM__factory;
  const fheCSMM = (await csmmFactory.deploy(token0Address, token1Address)) as FHECSMM;
  const fheCSMMAddress = await fheCSMM.getAddress();

  return {
    fheCSMM,
    fheCSMMAddress,
    token0,
    token1,
    token0Address,
    token1Address,
  };
}

describe("FHECSMM", function () {
  let signers: Signers;
  let fheCSMM: FHECSMM;
  let fheCSMMAddress: string;
  let token0: FHEToken;
  let token1: FHEToken;
  let token0Address: string;
  let token1Address: string;

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

    ({ fheCSMM, fheCSMMAddress, token0, token1, token0Address, token1Address } = await deployFixture());
  });

  async function mintTokensToUser(user: HardhatEthersSigner, amount0: number, amount1: number) {
    // Mint token0 to user
    const encryptedAmount0 = await fhevm
      .createEncryptedInput(token0Address, signers.deployer.address)
      .add64(amount0)
      .encrypt();

    let tx = await token0
      .connect(signers.deployer)
      .mint(user.address, encryptedAmount0.handles[0], encryptedAmount0.inputProof);
    await tx.wait();

    // Mint token1 to user
    const encryptedAmount1 = await fhevm
      .createEncryptedInput(token1Address, signers.deployer.address)
      .add64(amount1)
      .encrypt();

    tx = await token1
      .connect(signers.deployer)
      .mint(user.address, encryptedAmount1.handles[0], encryptedAmount1.inputProof);
    await tx.wait();
  }

  async function setOperator(user: HardhatEthersSigner) {
    let tx = await token0.connect(user).setOperator(fheCSMMAddress, 2 ** 48 - 1);
    await tx.wait();

    tx = await token1.connect(user).setOperator(fheCSMMAddress, 2 ** 48 - 1);
    await tx.wait();
  }

  it("should add liquidity to the pool", async function () {
    const amount0 = 1000;
    const amount1 = 2000;

    // Mint tokens to Alice
    await mintTokensToUser(signers.alice, amount0, amount1);

    // Approve tokens
    await setOperator(signers.alice);

    // Create encrypted inputs for addLiquidity
    const encryptedAmount0 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(amount0)
      .encrypt();

    const encryptedAmount1 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(amount1)
      .encrypt();

    // Add liquidity
    const tx = await fheCSMM
      .connect(signers.alice)
      .addLiquidity(
        encryptedAmount0.handles[0],
        encryptedAmount0.inputProof,
        encryptedAmount1.handles[0],
        encryptedAmount1.inputProof,
      );
    await tx.wait();

    // Check LP token balance
    const encryptedLPBalance = await fheCSMM.confidentialBalanceOf(signers.alice.address);
    const decryptedLPBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedLPBalance,
      fheCSMMAddress,
      signers.alice,
    );

    expect(decryptedLPBalance).to.eq(amount0 + amount1);
  });

  it("should swap token0 for token1", async function () {
    // First add liquidity
    const liquidityAmount0 = 10000;
    const liquidityAmount1 = 10000;

    await mintTokensToUser(signers.alice, liquidityAmount0, liquidityAmount1);
    await setOperator(signers.alice);

    const encryptedLiq0 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(liquidityAmount0)
      .encrypt();

    const encryptedLiq1 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(liquidityAmount1)
      .encrypt();

    let tx = await fheCSMM
      .connect(signers.alice)
      .addLiquidity(
        encryptedLiq0.handles[0],
        encryptedLiq0.inputProof,
        encryptedLiq1.handles[0],
        encryptedLiq1.inputProof,
      );
    await tx.wait();

    // Now Bob wants to swap
    const swapAmount0 = 1000;
    await mintTokensToUser(signers.bob, swapAmount0, 0);
    await setOperator(signers.bob);

    // Create encrypted inputs for swap (swap token0 for token1, so amount1 = 0)
    const encryptedSwapAmount0 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.bob.address)
      .add64(swapAmount0)
      .encrypt();

    const encryptedZero = await fhevm.createEncryptedInput(fheCSMMAddress, signers.bob.address).add64(0).encrypt();

    // Perform swap
    tx = await fheCSMM
      .connect(signers.bob)
      .swap(
        encryptedSwapAmount0.handles[0],
        encryptedSwapAmount0.inputProof,
        encryptedZero.handles[0],
        encryptedZero.inputProof,
      );
    await tx.wait();

    // Check Bob received token1 (997 after 0.3% fee)
    const encryptedBobToken1 = await token1.confidentialBalanceOf(signers.bob.address);
    const decryptedBobToken1 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBobToken1,
      token1Address,
      signers.bob,
    );
    expect(decryptedBobToken1).to.eq(997); // 1000 * 997 / 1000 = 997

    // Check Bob has no token0 left
    const encryptedBobToken0 = await token0.confidentialBalanceOf(signers.bob.address);
    const decryptedBobToken0 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBobToken0,
      token0Address,
      signers.bob,
    );
    expect(decryptedBobToken0).to.eq(0);
  });

  it("should swap token1 for token0", async function () {
    // First add liquidity
    const liquidityAmount0 = 10000;
    const liquidityAmount1 = 10000;

    await mintTokensToUser(signers.alice, liquidityAmount0, liquidityAmount1);
    await setOperator(signers.alice);

    const encryptedLiq0 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(liquidityAmount0)
      .encrypt();

    const encryptedLiq1 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(liquidityAmount1)
      .encrypt();

    let tx = await fheCSMM
      .connect(signers.alice)
      .addLiquidity(
        encryptedLiq0.handles[0],
        encryptedLiq0.inputProof,
        encryptedLiq1.handles[0],
        encryptedLiq1.inputProof,
      );
    await tx.wait();

    // Now Bob wants to swap token1 for token0
    const swapAmount1 = 2000;
    await mintTokensToUser(signers.bob, 0, swapAmount1);
    await setOperator(signers.bob);

    // Create encrypted inputs for swap (swap token1 for token0, so amount0 = 0)
    const encryptedZero = await fhevm.createEncryptedInput(fheCSMMAddress, signers.bob.address).add64(0).encrypt();

    const encryptedSwapAmount1 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.bob.address)
      .add64(swapAmount1)
      .encrypt();

    // Perform swap
    tx = await fheCSMM
      .connect(signers.bob)
      .swap(
        encryptedZero.handles[0],
        encryptedZero.inputProof,
        encryptedSwapAmount1.handles[0],
        encryptedSwapAmount1.inputProof,
      );
    await tx.wait();

    // Check Bob received token0 (1994 after 0.3% fee)
    const encryptedBobToken0 = await token0.confidentialBalanceOf(signers.bob.address);
    const decryptedBobToken0 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBobToken0,
      token0Address,
      signers.bob,
    );
    expect(decryptedBobToken0).to.eq(1994); // 2000 * 997 / 1000 = 1994

    // Check Bob has no token1 left
    const encryptedBobToken1 = await token1.confidentialBalanceOf(signers.bob.address);
    const decryptedBobToken1 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBobToken1,
      token1Address,
      signers.bob,
    );
    expect(decryptedBobToken1).to.eq(0);
  });

  it("should remove liquidity from the pool", async function () {
    // First add liquidity
    const amount0 = 5000;
    const amount1 = 3000;

    await mintTokensToUser(signers.alice, amount0, amount1);
    await setOperator(signers.alice);

    const encryptedAmount0 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(amount0)
      .encrypt();

    const encryptedAmount1 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(amount1)
      .encrypt();

    let tx = await fheCSMM
      .connect(signers.alice)
      .addLiquidity(
        encryptedAmount0.handles[0],
        encryptedAmount0.inputProof,
        encryptedAmount1.handles[0],
        encryptedAmount1.inputProof,
      );
    await tx.wait();

    // Now remove half of the liquidity
    const sharesToRemove = 4000; // Half of 8000 total LP tokens
    const expectedOut0 = 2500; // Half of 5000
    const expectedOut1 = 1500; // Half of 3000

    // Create encrypted inputs for removeLiquidity
    const encryptedShares = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(sharesToRemove)
      .encrypt();

    const encryptedOut0 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(expectedOut0)
      .encrypt();

    const encryptedOut1 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(expectedOut1)
      .encrypt();

    // Remove liquidity
    tx = await fheCSMM
      .connect(signers.alice)
      .removeLiquidity(
        encryptedShares.handles[0],
        encryptedShares.inputProof,
        encryptedOut0.handles[0],
        encryptedOut0.inputProof,
        encryptedOut1.handles[0],
        encryptedOut1.inputProof,
      );
    await tx.wait();

    // Check Alice received tokens back
    const encryptedAliceToken0 = await token0.confidentialBalanceOf(signers.alice.address);
    const decryptedAliceToken0 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedAliceToken0,
      token0Address,
      signers.alice,
    );
    expect(decryptedAliceToken0).to.eq(expectedOut0);

    const encryptedAliceToken1 = await token1.confidentialBalanceOf(signers.alice.address);
    const decryptedAliceToken1 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedAliceToken1,
      token1Address,
      signers.alice,
    );
    expect(decryptedAliceToken1).to.eq(expectedOut1);

    // Check remaining LP balance
    const encryptedLPBalance = await fheCSMM.confidentialBalanceOf(signers.alice.address);
    const decryptedLPBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedLPBalance,
      fheCSMMAddress,
      signers.alice,
    );
    expect(decryptedLPBalance).to.eq(amount0 + amount1 - sharesToRemove);
  });

  it("should handle multiple liquidity providers", async function () {
    // Alice adds liquidity
    const aliceAmount0 = 5000;
    const aliceAmount1 = 5000;

    await mintTokensToUser(signers.alice, aliceAmount0, aliceAmount1);
    await setOperator(signers.alice);

    let encryptedAmount0 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(aliceAmount0)
      .encrypt();

    let encryptedAmount1 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(aliceAmount1)
      .encrypt();

    let tx = await fheCSMM
      .connect(signers.alice)
      .addLiquidity(
        encryptedAmount0.handles[0],
        encryptedAmount0.inputProof,
        encryptedAmount1.handles[0],
        encryptedAmount1.inputProof,
      );
    await tx.wait();

    // Bob adds liquidity
    const bobAmount0 = 3000;
    const bobAmount1 = 3000;

    await mintTokensToUser(signers.bob, bobAmount0, bobAmount1);
    await setOperator(signers.bob);

    encryptedAmount0 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.bob.address)
      .add64(bobAmount0)
      .encrypt();

    encryptedAmount1 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.bob.address)
      .add64(bobAmount1)
      .encrypt();

    tx = await fheCSMM
      .connect(signers.bob)
      .addLiquidity(
        encryptedAmount0.handles[0],
        encryptedAmount0.inputProof,
        encryptedAmount1.handles[0],
        encryptedAmount1.inputProof,
      );
    await tx.wait();

    // Check LP balances
    const encryptedAliceLP = await fheCSMM.confidentialBalanceOf(signers.alice.address);
    const decryptedAliceLP = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedAliceLP,
      fheCSMMAddress,
      signers.alice,
    );
    expect(decryptedAliceLP).to.eq(aliceAmount0 + aliceAmount1);

    const encryptedBobLP = await fheCSMM.confidentialBalanceOf(signers.bob.address);
    const decryptedBobLP = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedBobLP, fheCSMMAddress, signers.bob);
    expect(decryptedBobLP).to.eq(bobAmount0 + bobAmount1);
  });

  it("should handle zero swap amounts", async function () {
    // First add liquidity
    const liquidityAmount0 = 10000;
    const liquidityAmount1 = 10000;

    await mintTokensToUser(signers.alice, liquidityAmount0, liquidityAmount1);
    await setOperator(signers.alice);

    const encryptedLiq0 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(liquidityAmount0)
      .encrypt();

    const encryptedLiq1 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(liquidityAmount1)
      .encrypt();

    let tx = await fheCSMM
      .connect(signers.alice)
      .addLiquidity(
        encryptedLiq0.handles[0],
        encryptedLiq0.inputProof,
        encryptedLiq1.handles[0],
        encryptedLiq1.inputProof,
      );
    await tx.wait();

    // Bob swaps zero amounts
    await setOperator(signers.bob);
    await mintTokensToUser(signers.bob, 0, 0);
    const encryptedZero1 = await fhevm.createEncryptedInput(fheCSMMAddress, signers.bob.address).add64(0).encrypt();
    const encryptedZero2 = await fhevm.createEncryptedInput(fheCSMMAddress, signers.bob.address).add64(0).encrypt();

    tx = await fheCSMM
      .connect(signers.bob)
      .swap(encryptedZero1.handles[0], encryptedZero1.inputProof, encryptedZero2.handles[0], encryptedZero2.inputProof);
    await tx.wait();
  });

  it("should handle invalid liquidity removal (amount split not equal to shares)", async function () {
    // First add liquidity
    const amount0 = 5000;
    const amount1 = 3000;

    await mintTokensToUser(signers.alice, amount0, amount1);
    await setOperator(signers.alice);

    const encryptedAmount0 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(amount0)
      .encrypt();

    const encryptedAmount1 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(amount1)
      .encrypt();

    let tx = await fheCSMM
      .connect(signers.alice)
      .addLiquidity(
        encryptedAmount0.handles[0],
        encryptedAmount0.inputProof,
        encryptedAmount1.handles[0],
        encryptedAmount1.inputProof,
      );
    await tx.wait();

    // Try to remove liquidity with invalid split (sum doesn't equal shares)
    const sharesToRemove = 4000;
    const invalidOut0 = 3000; // This sum (3000 + 500 = 3500) doesn't equal sharesToRemove (4000)
    const invalidOut1 = 500;

    const encryptedShares = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(sharesToRemove)
      .encrypt();

    const encryptedOut0 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(invalidOut0)
      .encrypt();

    const encryptedOut1 = await fhevm
      .createEncryptedInput(fheCSMMAddress, signers.alice.address)
      .add64(invalidOut1)
      .encrypt();

    // Remove liquidity with invalid split
    tx = await fheCSMM
      .connect(signers.alice)
      .removeLiquidity(
        encryptedShares.handles[0],
        encryptedShares.inputProof,
        encryptedOut0.handles[0],
        encryptedOut0.inputProof,
        encryptedOut1.handles[0],
        encryptedOut1.inputProof,
      );
    await tx.wait();

    // Due to validation failure, no tokens should be transferred
    const encryptedAliceToken0 = await token0.confidentialBalanceOf(signers.alice.address);
    const decryptedAliceToken0 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedAliceToken0,
      token0Address,
      signers.alice,
    );
    expect(decryptedAliceToken0).to.eq(0);

    const encryptedAliceToken1 = await token1.confidentialBalanceOf(signers.alice.address);
    const decryptedAliceToken1 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedAliceToken1,
      token1Address,
      signers.alice,
    );
    expect(decryptedAliceToken1).to.eq(0);

    // LP tokens should still be burned
    const encryptedLPBalance = await fheCSMM.confidentialBalanceOf(signers.alice.address);
    const decryptedLPBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedLPBalance,
      fheCSMMAddress,
      signers.alice,
    );
    expect(decryptedLPBalance).to.eq(amount0 + amount1 - sharesToRemove);
  });
});
