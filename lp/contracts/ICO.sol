//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./SpaceCoin.sol";

/**
@title Space initial coin offering smart contract.
@notice This contract gives SpaceCoin tokens in exchange for ETH.
@author @benedictleekw
 */
contract ICO {
    /**
    @notice Event emitted when SPC tokens are sent to an address.
    @param investorAddress address where tokens are sent.
    @param ethAmount amount of SPC tokens sent.
     */
    event TokenClaimed(address investorAddress, uint256 ethAmount);
    
    /**
    @notice Event emitted when a contribution is made.
    @param investorAddress address of the contributor.
    @param ethAmount ETH amount contributed.
    @param remainingLimit ETH amount left that can be contribute
     */
    event Contributed(
        address investorAddress,
        uint256 ethAmount,
        uint256 remainingLimit
    );

    /**
    @notice Event emitted when phase is advanced.
    @param phase current phase of the ICO after the update.
     */
    event PhaseAdvanced(Phase phase);

    /**
    @notice Event emitted when ICO paused state has changed.
     */
    event IsPaused(bool isPaused);

    error UnableToAdvancePhase();

    /**
    ICO has 3 phases.
    Seed: Allow list only. Individual contribution max: 1,500 ETH. Seed max contribution: 15,000 ETH.
    General: Open to everyone. Individual contribution max: 1,000 ETH.
    Open: Open to everyone. No individual contribution max.
     */
    enum Phase {
        Seed,
        General,
        Open
    }

    // Contribution limit is fixed to 30,000 ETH.
    uint256 public constant FUNDING_GOAL = 30000 ether;
    // Contribution limit during seed is fixed to 15,000 ETH.
    uint256 public constant SEED_PHASE_TOTAL_LIMIT = 15000 ether;
    // Individual contribution limit during seed is fixed to 1,500 ETH.
    uint256 public constant SEED_INDIVIDUAL_LIMIT = 1500 ether;
    // Individual contribution limit during general is fixed to 1,000 ETH.
    uint256 public constant GENERAL_INDIVIDUAL_LIMIT = 1000 ether;
    // SPC/ETH exchange rate, fixed to 5 SPC per ETH.
    uint256 public constant ETH_TO_TOKEN_CONVERSION_RATE = 5;

    /**
    @notice Current phase of the ICO
    @dev Phase can only move forwards, never backwards.
     */
    Phase public phase;

    /**
    @notice Maps an address to a flag indicating wether they're in the allow list or not.
    @dev This is implemented as a mapping instead of an array of addresses because is way simpler
    and cheaper to check if an address is allowed or not.
     */
    mapping(address => bool) public allowlistAddress;

    /**
    @notice Maps contributor addresses to unclaimed contributions
     */
    mapping(address => uint256) public unclaimedContribution;

    address public immutable owner;

    /**
    @notice This is the token that the ICO gives away in exchange for ETH.
     */
    SpaceCoin public immutable token;

    address public immutable tokenAddress;

    address public immutable treasuryAddress;

    /**
    @notice Sum of all contributions.
    @dev Total contributions don't rely on the contract's balance. The reason is to avoid
    receiving ETH via non conventional methods (e.g. SELFDESTRUCT, etc.) and leave real
    contributors out if the max limits are reached.
     */
    uint256 public fundsRaised;

    /**
    @notice Stores wether the ICO is paused or not.
     */
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

    /**
    @notice Contributes ETH in exchange for SPC tokens.
    @dev SPC tokens are either given right away or claimable afterwards, depending on the current phase.
    @dev Emits Contributed event.
     */
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

    /**
    @notice Claims SPC tokens based on contributions made during Seed and General phases.
    @dev Contributor during Seed and General phases are not given tokens instantly. Instead,
    they use this function to claim the tokens once the Open phase is reached.
     */
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

    /**
    @notice Adding addresses to allowlist so they are allow to contribute on seed phase
    @param addresses array of address to be added to seed phase
     */
    function addAllowlistAddress(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            allowlistAddress[addresses[i]] = true;
        }
    }

    /**
    @notice Advances to next phase, based on Phase enum values
    @dev Phase can only move forwards, never backwards.
    @dev Once phase Open is reached, it's definitive.
    @dev Emits PhaseAdvanced(Phase) event.
     */
    function advancePhase() external onlyOwner {
        if (phase == Phase.Open) revert UnableToAdvancePhase();
        phase = Phase(uint256(phase) + 1);

        emit PhaseAdvanced(phase);
    }

    /**
    @notice update pause state for the ICO.
    @param _flag pause state to be update to
    @dev Only the owner can update pause.
    @dev Emits IsPaused().
     */
    function setIsPaused(bool _flag) external onlyOwner {
        isPause = _flag;

        emit IsPaused(_flag);
    }

    /**
    @notice withdraw all funds from contract to treasury address
    @dev Only the owner can update pause.
     */
    function withdraw() external onlyOwner {
        (bool success, ) = payable(treasuryAddress).call{value: address(this).balance}("");
        require(success, "ICO: withdraw failed");
    }
}
