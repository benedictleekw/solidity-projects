//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./SpaceCoin.sol";

contract ICO {
    event TokenClaimed(address investorAddress, uint256 ethAmount);
    event Contributed(
        address investorAddress,
        uint256 ethAmount,
        uint256 remainingLimit
    );
    event PhaseAdvanced(Phase phase);
    event IsPaused(bool isPaused);

    error UnableToAdvancePhase();

    enum Phase {
        Seed,
        General,
        Open
    }

    uint256 public constant FUNDING_GOAL = 30000 ether;
    uint256 public constant SEED_PHASE_TOTAL_LIMIT = 15000 ether;
    uint256 public constant SEED_INDIVIDUAL_LIMIT = 1500 ether;
    uint256 public constant GENERAL_INDIVIDUAL_LIMIT = 1000 ether;
    uint256 public constant ETH_TO_TOKEN_CONVERSION_RATE = 5;

    Phase public phase;
    mapping(address => bool) public allowlistAddress;
    mapping(address => uint256) public unclaimedContribution;
    address public immutable owner;
    SpaceCoin public immutable token;
    address public immutable tokenAddress;
    address public immutable treasuryAddress;
    uint256 public fundsRaised;
    bool public isPause = true;

    modifier onlyOwner() {
        require(msg.sender == owner, "ICO: The sender is not project owner");
        _;
    }

    constructor(address _treasuryAddress) {
        owner = msg.sender;
        token = new SpaceCoin(
            address(owner),
            address(this),
            _treasuryAddress
        );
        tokenAddress = address(token);
        treasuryAddress = _treasuryAddress;
    }

    function contribute() external payable {
        require(isPause == false, "ICO: ico state is paused");
        require(
            fundsRaised + msg.value <= FUNDING_GOAL,
            "ICO: fund goal has reached"
        );

        if (phase == Phase.Seed) {
            require(
                allowlistAddress[msg.sender] == true,
                "ICO: msg.sender is not in the allowlist"
            );
            require(
                fundsRaised + msg.value <= SEED_PHASE_TOTAL_LIMIT,
                "ICO: Seed phase total contribution limit exceeded"
            );
            require(
                unclaimedContribution[msg.sender] + msg.value <=
                    SEED_INDIVIDUAL_LIMIT,
                "ICO: Seed phase individual contribution limit exceeded"
            );
            unclaimedContribution[msg.sender] += msg.value;
            emit Contributed(
                msg.sender,
                msg.value,
                SEED_INDIVIDUAL_LIMIT - unclaimedContribution[msg.sender]
            );
        } else if (phase == Phase.General) {
            require(
                unclaimedContribution[msg.sender] + msg.value <=
                    GENERAL_INDIVIDUAL_LIMIT,
                "ICO: General phase individual contribution limit exceeded"
            );
            unclaimedContribution[msg.sender] += msg.value;
            emit Contributed(
                msg.sender,
                msg.value,
                GENERAL_INDIVIDUAL_LIMIT - unclaimedContribution[msg.sender]
            );
        } else {
            token.transfer(
                msg.sender,
                msg.value * ETH_TO_TOKEN_CONVERSION_RATE
            );
        }
        fundsRaised += msg.value;
    }

    function claimToken() external {
        require(phase == Phase.Open, "ICO: Can only claim token on open phase");
        require(
            unclaimedContribution[msg.sender] > 0,
            "ICO: There is no token to claim"
        );
        uint256 ethContributed = unclaimedContribution[msg.sender];
        unclaimedContribution[msg.sender] = 0;
        token.transfer(
            msg.sender,
            ethContributed * ETH_TO_TOKEN_CONVERSION_RATE
        );

        emit TokenClaimed(msg.sender, ethContributed);
    }

    function addAllowlistAddress(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            allowlistAddress[addresses[i]] = true;
        }
    }

    function advancePhase() external onlyOwner {
        if (phase == Phase.Open) revert UnableToAdvancePhase();
        phase = Phase(uint256(phase) + 1);

        emit PhaseAdvanced(phase);
    }

    function setIsPaused(bool _flag) external onlyOwner {
        isPause = _flag;

        emit IsPaused(_flag);
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(treasuryAddress).call{value: address(this).balance}("");
        require(success, "ICO: withdraw failed");
    }
}
