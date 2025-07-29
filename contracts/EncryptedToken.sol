// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ConfidentialFungibleToken} from "@openzeppelin/confidential-contracts/token/ConfidentialFungibleToken.sol";

contract EncryptedToken is ConfidentialFungibleToken {
    constructor(string memory name, string memory symbol) ConfidentialFungibleToken(name, symbol, "") {}

    /// @notice Mint tokens to an address
    /// @param to The address to mint tokens to
    /// @param inputEuint64 The encrypted amount of tokens to mint
    /// @param inputProof The proof of the encrypted amount
    function mint(address to, externalEuint64 inputEuint64, bytes calldata inputProof) public {
        euint64 amount = FHE.fromExternal(inputEuint64, inputProof);
        _mint(to, amount);
    }

    /// @notice Burn tokens from an address
    /// @param from The address to burn tokens from
    /// @param inputEuint64 The encrypted amount of tokens to burn
    /// @param inputProof The proof of the encrypted amount
    function burn(address from, externalEuint64 inputEuint64, bytes calldata inputProof) public {
        euint64 amount = FHE.fromExternal(inputEuint64, inputProof);
        _burn(from, amount);
    }
}
