// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title InterchainCalls Library
/// @notice This library defines structures for cross-chain calls using Axelar Network
library InterchainCalls {
    /// @dev Represents a complete interchain call
    struct InterchainCall {
        string destinationChain; // The name of the destination chain
        string destinationContract; // The address of the contract on the destination chain
        uint256 gas; // The amount of gas to be paid for the call
        Call[] calls; // An array of calls to be executed on the destination chain
    }

    /// @dev Represents a single call to be executed on the destination chain
    struct Call {
        address target; // The address of the contract to call on the destination chain
        uint256 value; // The amount of native tokens to send with the call
        bytes callData; // The encoded function call data
    }
}
