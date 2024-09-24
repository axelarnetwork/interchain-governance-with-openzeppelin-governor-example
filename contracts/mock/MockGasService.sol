// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title MockAxelarGasService
/// @dev This is a mock contract for testing purposes that simulates the behavior of AxelarGasService.
contract MockAxelarGasService {
    function payNativeGasForContractCall(
        address,
        string memory,
        string memory,
        bytes memory,
        address
    ) external payable {}
}
