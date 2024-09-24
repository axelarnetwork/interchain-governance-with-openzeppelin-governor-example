// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title ThresholdContract
/// @notice A simple contract to manage and update a threshold value
contract ThresholdContract {
    uint256 public threshold;

    event ThresholdUpdated(uint256 newThreshold);

    /// @notice Updates the threshold to a new value
    /// @param newThreshold The new threshold value to set
    function updateThreshold(uint256 newThreshold) external {
        threshold = newThreshold;
        emit ThresholdUpdated(newThreshold);
    }
}
