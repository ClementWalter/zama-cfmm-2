// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IConfidentialFungibleToken} from
    "@openzeppelin/confidential-contracts/interfaces/IConfidentialFungibleToken.sol";

/// @title FHE-based Constant Function Market Maker (CFMM) Pair
/// @notice A simple AMM pair contract using encrypted reserves
contract FHEPair is SepoliaConfig {
    IConfidentialFungibleToken public tokenA;
    IConfidentialFungibleToken public tokenB;
    euint64 public reserveA;
    euint64 public reserveB;

    event LiquidityAdded(address indexed provider);
    event Swap(address indexed trader, bool isAtoB);

    constructor(address _tokenA, address _tokenB) {
        tokenA = IConfidentialFungibleToken(_tokenA);
        tokenB = IConfidentialFungibleToken(_tokenB);
    }

    /// @notice Add liquidity to the pool
    /// @param token The token to add liquidity to
    /// @param input Encrypted amount of token
    /// @param proof Proof for the input amount
    function addLiquidity(address token, externalEuint64 input, bytes calldata proof) public {
        euint64 amount = FHE.fromExternal(input, proof);

        IConfidentialFungibleToken(token).confidentialTransferFrom(msg.sender, address(this), amount);

        reserveA = FHE.add(reserveA, amount);

        FHE.allow(reserveA, address(this));

        emit LiquidityAdded(msg.sender);
    }

    /// @notice Swap token A for token B
    /// @param inputEuint64 Encrypted amount of token A to swap
    /// @param inputProof Proof for the input amount
    /// @param maxPriceRatio Maximum price ratio (scaled by 1000) for slippage protection
    function swapAtoB(externalEuint64 inputEuint64, bytes calldata inputProof, uint64 maxPriceRatio) public {
        euint64 input = FHE.fromExternal(inputEuint64, inputProof);

        euint64 scaledInput = FHE.mul(input, maxPriceRatio);
        euint64 output = FHE.div(scaledInput, 1000); // Division by plaintext is supported

        tokenA.confidentialTransferFrom(msg.sender, address(this), input);

        reserveA = FHE.add(reserveA, input);
        reserveB = FHE.sub(reserveB, output);

        FHE.allow(reserveA, address(this));
        FHE.allow(reserveB, address(this));
        FHE.allow(output, address(this));
        FHE.allow(output, msg.sender);

        tokenB.confidentialTransfer(msg.sender, output);

        emit Swap(msg.sender, true);
    }

    /// @notice Swap token B for token A
    /// @param inputEuint64 Encrypted amount of token B to swap
    /// @param inputProof Proof for the input amount
    /// @param maxPriceRatio Maximum price ratio (scaled by 1000) for slippage protection
    function swapBtoA(externalEuint64 inputEuint64, bytes calldata inputProof, uint64 maxPriceRatio) public {
        euint64 input = FHE.fromExternal(inputEuint64, inputProof);

        euint64 scaledInput = FHE.mul(input, maxPriceRatio);
        euint64 output = FHE.div(scaledInput, 1000); // Division by plaintext is supported

        tokenB.confidentialTransferFrom(msg.sender, address(this), input);

        reserveB = FHE.add(reserveB, input);
        reserveA = FHE.sub(reserveA, output);

        FHE.allow(reserveA, address(this));
        FHE.allow(reserveB, address(this));
        FHE.allow(output, address(this));
        FHE.allow(output, msg.sender);

        tokenA.confidentialTransfer(msg.sender, output);

        emit Swap(msg.sender, false);
    }

    /// @notice Get encrypted reserves
    /// @return Encrypted reserve A and reserve B
    function getReserves() public view returns (euint64, euint64) {
        return (reserveA, reserveB);
    }
}
