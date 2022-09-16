//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Project is ERC721 {

    enum State {
        Active,
        Successful,
        Failed
    }

    address public creator;
    uint public deadline;
    uint public immutable goalAmount;
    uint public currentAmount;
    mapping (address => uint) public fundsContributed;
    bool public projectEnded = false;
    uint public finalAmount;
    uint public currentNFTSupply;

    // Emit event when there's a contribution
    event ContributionReceived(address contributor, uint amount, uint currentTotal);

    // Emit event when creator withdraws funds
    event WithdrawalFunds(uint amount, uint currentTotal);

    // Emit event when contributor refund funds
    event RefundFunds(address contributor, uint amount);

    // Emit event when creator cancel the project
    event ProjectCancelation(uint currentTotal);

    modifier onlyCreator() {
        require(msg.sender == creator, "The sender is not project owner");
        _;
    }

    constructor (uint _goalAmount, address _creator, string memory _name, string memory _symbol) ERC721(_name, _symbol) {
        goalAmount = _goalAmount;
        deadline = block.timestamp + 30 days;
        creator = _creator;
    }

    function contribute() external payable {
        require(checkState() == State.Active, "The project is not active");
        require(msg.value >= 0.01 ether, "Contribute amount is less than 0.01 ETH");
        uint initialContribution = fundsContributed[msg.sender];
        fundsContributed[msg.sender] = fundsContributed[msg.sender] + msg.value;
        currentAmount = currentAmount + msg.value;
        if (initialContribution > 1 ether) {
            initialContribution = initialContribution % 10;
        }
        if (msg.value + initialContribution >= 1 ether) {
            mint();
        }
        emit ContributionReceived(msg.sender, msg.value, currentAmount);
    }
    
    function checkState() public returns (State) {
        if (block.timestamp < deadline && currentAmount < goalAmount && !projectEnded) {
            return State.Active;
        } else if (currentAmount >= goalAmount && !projectEnded) {
            projectEnded = true;
            finalAmount = currentAmount;
            return State.Successful;
        } else if (finalAmount != 0) {
            return State.Successful;
        } else {
            projectEnded = true;
            return State.Failed;
        }
    }

    function untrustedWithdrawals(uint withdrawAmount) external onlyCreator {
        require(checkState() == State.Successful, "The project is not successful");
        require(currentAmount >= withdrawAmount, "Cannot withdraw more than leftover balance");
        currentAmount -= withdrawAmount;
        (bool success, ) = msg.sender.call{value: withdrawAmount}("");
        require(success, "withdraw failed");
        emit WithdrawalFunds(withdrawAmount, currentAmount);
    }

    function untrustedRefunds() public {
        require(checkState() == State.Failed, "The project did not failed");
        require(fundsContributed[msg.sender] > 0, "sender has no contributed funds balance");

        uint refundAmount = fundsContributed[msg.sender];
        fundsContributed[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "refund failed");
        emit RefundFunds(msg.sender, refundAmount);
    }

    function cancelations() external onlyCreator {
        require(checkState() == State.Active, "The project is not active");
        deadline = block.timestamp;
        emit ProjectCancelation(currentAmount);
    }

    function mint() public returns (uint256) {
        currentNFTSupply++;
        uint256 newItemId = currentNFTSupply;
        _safeMint(msg.sender, newItemId);
        return newItemId;
    }

    fallback() external payable {}

    receive() external payable {}
}
