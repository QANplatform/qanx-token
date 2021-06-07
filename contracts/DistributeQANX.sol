// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface TransferableQANX {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transferLocked(address recipient, uint256 amount, uint32 hardLockUntil, uint32 softLockUntil, uint8 allowedHops) external returns (bool);
}

contract DistributeQANX {

    TransferableQANX private _qanx;

    constructor(TransferableQANX qanx_) {
        _qanx = qanx_;
    }

    function distribute(uint256 total, address[] calldata recipients, uint256[] calldata amounts) external {
        require(_qanx.transferFrom(msg.sender, address(this), total));
        for (uint256 i = 0; i < recipients.length; i++){
            require(_qanx.transfer(recipients[i], amounts[i]));
        }
    }

    function distributeLocked(
        uint256 total,
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint32[]  calldata hardLocks, 
        uint32[]  calldata softLocks,
        uint8[]   calldata allowedHops) external 
    {
        require(_qanx.transferFrom(msg.sender, address(this), total));
        for (uint256 i = 0; i < recipients.length; i++){
            require(_qanx.transferLocked(recipients[i], amounts[i], hardLocks[i], softLocks[i], allowedHops[i]));
        }
    }
}
