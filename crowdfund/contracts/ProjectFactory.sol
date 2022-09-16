//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./Project.sol";

contract ProjectFactory {
    event ProjectCreated(address newProject, address creator, uint256 goalAmount);

    Project[] public projects;

    function create(uint goalAmount, string memory name, string memory symbol) external {
        Project newProject = new Project(goalAmount, msg.sender, name, symbol);
        projects.push(newProject);

        emit ProjectCreated(address(newProject), msg.sender, goalAmount);
    }
}