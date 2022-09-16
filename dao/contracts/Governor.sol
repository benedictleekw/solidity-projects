//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

/**
@title Collector DAO smart contract.
@notice This contract is the house the logic of the DAO.
 */
contract Governor {
    enum ProposalState {
        PreActive,
        Active,
        Succeed,
        Failed,
        Executed
    }

    enum VoteOptions {
        Yes,
        No
    }

    struct ProposalDetails {
        uint256 startTime;
        uint256 endTime;
        uint256 totalMemberSnapshot;
        mapping(address => bool) voterAddress;
        uint256 totalVotes;
        uint256 yesCount;
        uint256 noCount;
        bool executed;
    }

     /**
    @notice Event emitted when proposal is created.
     */
    event ProposalCreated(uint256 indexed proposalId, address creator);
     /**
    @notice Event emitted when vote is cast.
     */
    event VoteCasted(uint256 indexed proposalId, address voter, VoteOptions voteDecision);
     /**
    @notice Event emitted when a proposal is executed.
     */
    event ProposalExecuted(uint256 indexed proposalId, address executor);

    // Constants
    uint256 public constant QUORUM_PERCENTAGE = 25;
    /// @notice The EIP-712 typehash for the contract's domain
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(uint256 chainId,address verifyingContract)");
    /// @notice The EIP-712 typehash for the ballot struct used by the contract
    bytes32 public constant BALLOT_TYPEHASH =
        keccak256("Ballot(uint256 proposalId,uint8 voteDecision)");

    address public immutable nftMarketplace;

    uint256 totalMembers;
    /// @notice Store membership address with time when they join the DAO
    mapping(address => uint256) public memberAddress;
    /// @notice Maps proposal hash to proposal details
    mapping(uint256 => ProposalDetails) public proposals;
    /// @notice Maps member address to last proposal proposed by the member
    mapping(address => uint256) public previousProposalIdByMember;

    constructor(address _nftMarketplace) {
        nftMarketplace = _nftMarketplace;
    }

    modifier isMember() {
        require(
            memberAddress[msg.sender] != 0,
            "Governor: The sender is not a member"
        );
        _;
    }

    function buy() external payable {
        require(
            memberAddress[msg.sender] == 0,
            "Governor: sender is already a member"
        );
        require(msg.value == 1 ether, "Governor: msg.value is not 1 ether");
        memberAddress[msg.sender] = block.timestamp;
        totalMembers++;
    }

    function createBuyNFTProposal(address nftAddress, uint nftId, uint maxPrice, string memory description)
        external
        isMember
    {
        address[] memory targetAddresses;
        uint256[] memory values;
        bytes[] memory calldatas;
        (targetAddresses, values, calldatas) = buildBuyNFTParamHash(nftAddress, nftId, maxPrice);

        createProposal(targetAddresses, values, calldatas, description);
    }

    function buildBuyNFTParamHash(address nftAddress, uint nftId, uint256 maxPrice) internal view returns(address[] memory targetAddresses, uint256[] memory values,
        bytes[] memory calldatas) {
        targetAddresses = new address[](1);
        targetAddresses[0] = nftMarketplace;
        
        values = new uint256[](1);
        values[0] = maxPrice;

        calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature(
            "buy(address,uint256)",
            nftAddress,
            nftId
        );
    }

    function createProposal(
        address[] memory targetAddresses,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public isMember returns (uint256 proposalId) {
        proposalId = hashProposal(targetAddresses, values, calldatas, keccak256(bytes(description)));
        require(
            proposals[proposalId].startTime == 0,
            "Governor: proposal already exist"
        );
        uint256 senderPreviousProposalId = previousProposalIdByMember[
            msg.sender
        ];
        if (senderPreviousProposalId != 0) {
            ProposalState proposalState = state(senderPreviousProposalId);
            require(
                proposalState != ProposalState.PreActive &&
                    proposalState != ProposalState.Active,
                "Governor: there can only be one active proposal per member"
            );
        }

        ProposalDetails storage _proposal = proposals[proposalId];
        _proposal.startTime = block.timestamp + 13 minutes;
        _proposal.endTime = block.timestamp + 7 days;
        _proposal.totalMemberSnapshot = totalMembers;

        previousProposalIdByMember[msg.sender] = proposalId;

        emit ProposalCreated(proposalId, msg.sender);
    }

    function hashProposal(
        address[] memory targetAddresses,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public pure returns (uint256) {
        return
            uint256(keccak256(abi.encode(targetAddresses, values, calldatas, descriptionHash)));
    }

    function state(uint256 proposalId) public view returns (ProposalState) {
        require(
            proposals[proposalId].startTime != 0,
            "Governor: proposal doesn't exist"
        );
        ProposalDetails storage _proposal = proposals[proposalId];
        if (_proposal.executed) {
            return ProposalState.Executed;
        } else if (block.timestamp <= _proposal.startTime) {
            return ProposalState.PreActive;
        } else if (block.timestamp <= _proposal.endTime) {
            return ProposalState.Active;
        } else if (
            _quorumReach(_proposal) && _proposal.yesCount > _proposal.noCount
        ) {
            return ProposalState.Succeed;
        } else {
            return ProposalState.Failed;
        }
    }

    function vote(uint256 proposalId, VoteOptions voteDecision)
        external
        isMember
    {
        _vote(proposalId, voteDecision, msg.sender);
    }

    function voteSigs(
        uint256[] memory proposalIds,
        VoteOptions[] memory voteDecisions,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) external {
        require(proposalIds.length == voteDecisions.length && voteDecisions.length == v.length && v.length == r.length && r.length == s.length, "Governor: invalid args length");
        for (uint i=0; i < proposalIds.length; i++) {
            voteSig(proposalIds[i], voteDecisions[i], v[i], r[i], s[i]);
        }
    }

    function voteSig(
        uint256 proposalId,
        VoteOptions voteDecision,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        bytes32 domainSeparator = keccak256(
            abi.encode(DOMAIN_TYPEHASH, block.chainid, address(this))
        );
        bytes32 structHash = keccak256(
            abi.encode(BALLOT_TYPEHASH, proposalId, voteDecision)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );
        address voterAddress = ecrecover(digest, v, r, s);
        _vote(proposalId, voteDecision, voterAddress);
    }

    function _vote(
        uint256 proposalId,
        VoteOptions voteDecision,
        address voterAddress
    ) internal {
        ProposalDetails storage _proposal = proposals[proposalId];
        require(
            state(proposalId) == ProposalState.Active,
            "Governor: The proposal is not active"
        );
        require(
            _proposal.voterAddress[voterAddress] == false,
            "Governor: The voter has already voted"
        );
        require(
            memberAddress[voterAddress] < _proposal.startTime,
            "Governor: New members are not allowed to vote on active proposal"
        );
        require(
            memberAddress[voterAddress] > 0,
            "Governor: Needs to be member in order to cast vote"
        );

        // To keep track which address had voted
        _proposal.voterAddress[voterAddress] = true;
        if (voteDecision == VoteOptions.Yes) {
            _proposal.yesCount++;
        } else {
            _proposal.noCount++;
        }

        _proposal.totalVotes++;

        emit VoteCasted(proposalId, voterAddress, voteDecision);
    }

    function executeBuyNFT(address nftAddress, uint nftId, uint maxPrice, string memory description)
        external
        isMember
    {
        address[] memory targetAddresses;
        uint256[] memory values;
        bytes[] memory calldatas;
        (bool success, bytes memory data) = nftMarketplace.call(
            abi.encodeWithSignature(
                "getPrice(address,uint256)",
                nftAddress,
                nftId
            )
        );
        require(success, "Governor: Failed to retrieve nft price");
        uint nftPrice = (abi.decode(data, (uint)));
        require(nftPrice <= maxPrice, "Governor: NFT market price exceed maxPrice");
        (targetAddresses, values, calldatas) = buildBuyNFTParamHash(nftAddress, nftId, maxPrice);
        execute(targetAddresses, values, calldatas, description);
    }

    function execute(
        address[] memory targetAddresses,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public isMember {
        uint256 proposalId = hashProposal(targetAddresses, values, calldatas, keccak256(bytes(description)));
        require(
            state(proposalId) == ProposalState.Succeed,
            "Governor: proposal is not succeed state"
        );
        ProposalDetails storage _proposal = proposals[proposalId];
        _proposal.executed = true;

        for (uint i = 0; i < targetAddresses.length; i++) {
            (bool success, ) = targetAddresses[i].call{value: values[i]}(
                calldatas[i]
            );
            require(success, "Governor: execution transaction reverted");
        }

        emit ProposalExecuted(proposalId, msg.sender);
    }

    function _quorumReach(ProposalDetails storage _proposal)
        private
        view
        returns (bool)
    {
        uint256 participateRate = (_proposal.totalVotes * 100) /
            _proposal.totalMemberSnapshot;
        return participateRate >= QUORUM_PERCENTAGE;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
