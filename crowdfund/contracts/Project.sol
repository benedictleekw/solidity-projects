//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @dev Implementation of Crowdfundr, a way to inherit inherits ERC-721 Non-Fungible Token Standard
 * where creator can register a project with a goal to and contributors can contribute to meet the goal
 * set by the creator
 * @author @benedictleekw
 */
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
    bool public projectEnded;
    uint public finalAmount;
    uint public tokenId;

    // Emit event when there's a contribution
    event ContributionReceived(address contributor, uint amount, uint currentTotal);

    // Emit event when creator withdraws funds
    event WithdrawalFunds(uint amount, uint currentTotal);

    // Emit event when contributor refund funds
    event RefundFunds(address contributor, uint amount);

    // Emit event when creator cancel the project
    event ProjectCancelation(uint currentTotal);

    modifier onlyCreator() {
        require(msg.sender == creator, "Project: The sender is not project owner");
        _;
    }

    constructor (uint _goalAmount, address _creator, string memory _name, string memory _symbol) ERC721(_name, _symbol) {
        goalAmount = _goalAmount;
        deadline = block.timestamp + 30 days;
        creator = _creator;
    }

    /** @dev external address can contribute ether to help reach the goal of the project
      * and send contribution badge to contributors 
      * requirements: active project and contribution equal or more than 0.01 ether
     */ 
    function contribute() external payable {
        require(checkState() == State.Active, "Project: The project is not active");
        require(msg.value >= 0.01 ether, "Project: Contribute amount is less than 0.01 ETH");
        fundsContributed[msg.sender] = fundsContributed[msg.sender] + msg.value;
        currentAmount = currentAmount + msg.value;

        uint badgesToBeMinted = (fundsContributed[msg.sender] / 1 ether) - balanceOf(msg.sender);

        for (uint i = 0; i < badgesToBeMinted; i++) {
            tokenId++;
            _safeMint(msg.sender, tokenId);
        }
        emit ContributionReceived(msg.sender, msg.value, currentAmount);
    }
    
    /** @dev checks the current state of the project
      * 
     */
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

    /** @dev when project succeeds, creator can withdraw any amount of money
      * @param withdrawAmount amount of wei to withdraw
     */
    function withdrawals(uint withdrawAmount) external onlyCreator {
        require(checkState() == State.Successful, "Project: The project is not successful");
        require(currentAmount >= withdrawAmount, "Project: Cannot withdraw more than leftover balance");
        currentAmount -= withdrawAmount;
        (bool success, ) = msg.sender.call{value: withdrawAmount}("");
        require(success, "withdraw failed");
        emit WithdrawalFunds(withdrawAmount, currentAmount);
    }

    /** @dev when project fails, contributors can get their money back
      * requirements: failure or cancellation, previous contributors
     */
    function refunds() external {
        require(checkState() == State.Failed, "Project: The project did not failed");
        require(fundsContributed[msg.sender] > 0, "Project: sender has no contributed funds balance");

        uint refundAmount = fundsContributed[msg.sender];
        fundsContributed[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "refund failed");
        emit RefundFunds(msg.sender, refundAmount);
    }

    /** @dev creator address can cancel the project if before the deadline
     * requirements: active project and creator
     */
    function cancelations() external onlyCreator {
        require(checkState() == State.Active, "Project: project is not active");
        deadline = block.timestamp;
        emit ProjectCancelation(currentAmount);
    }
}
