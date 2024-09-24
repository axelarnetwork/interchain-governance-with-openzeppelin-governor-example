// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title MockAxelarGateway
/// @dev This is a mock contract for testing purposes that simulates the behavior of AxelarGateway.
contract MockAxelarGateway {
    /// @notice Simulates the cross-chain contract call
    function callContract(
        string memory,
        string memory,
        bytes memory
    ) external pure {}
}
