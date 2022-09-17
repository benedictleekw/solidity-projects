//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./Project.sol";

/**
 * @dev Factory of Project used for Crowdfundr
 * @author @benedictleekw	
 */
contract ProjectFactory {
    event ProjectCreated(address newProject, address creator, uint256 goalAmount);

    Project[] public projects;

    /** 
      * @dev creates a Project for artist with specified goal 
     */
    function create(uint goalAmount, string memory name, string memory symbol) external {
        Project newProject = new Project(goalAmount, msg.sender, name, symbol);
        projects.push(newProject);

        emit ProjectCreated(address(newProject), msg.sender, goalAmount);
    }
}