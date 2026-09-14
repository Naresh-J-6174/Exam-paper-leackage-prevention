// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ExamPaperRegistry
/// @notice Anchors a tamper-evident fingerprint of each exam paper on-chain.
/// The actual file never touches the chain — only its SHA-256 hash and
/// metadata do. Any change to the stored file (even one byte) produces a
/// different hash and is caught the moment someone tries to verify it.
contract ExamPaperRegistry {
    enum Role {
        None,
        Admin,
        Teacher,
        Invigilator
    }

    struct Paper {
        bytes32 fileHash;       // SHA-256 hash of the encrypted file
        address uploadedBy;     // wallet that registered the paper
        uint256 uploadedAt;     // block timestamp of registration
        uint256 releaseAt;      // earliest timestamp the paper may be released
        bool released;          // whether an invigilator has released it
        bool revoked;           // admin can revoke a compromised paper
        string examCode;        // human-readable exam identifier
    }

    address public owner;
    mapping(address => Role) public roles;
    mapping(bytes32 => Paper) public papers; // key: keccak256(examCode + version)
    bytes32[] public paperKeys;

    event RoleAssigned(address indexed account, Role role);
    event PaperRegistered(bytes32 indexed key, string examCode, bytes32 fileHash, address indexed uploadedBy, uint256 releaseAt);
    event PaperVerified(bytes32 indexed key, bool matched, address indexed verifiedBy);
    event PaperReleased(bytes32 indexed key, address indexed releasedBy);
    event PaperRevoked(bytes32 indexed key, address indexed revokedBy, string reason);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyRole(Role r) {
        require(roles[msg.sender] == r || msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.Admin;
    }

    function assignRole(address account, Role role) external onlyOwner {
        roles[account] = role;
        emit RoleAssigned(account, role);
    }

    /// @notice Teacher registers a newly uploaded paper's fingerprint.
    function registerPaper(
        string calldata examCode,
        bytes32 fileHash,
        uint256 releaseAt
    ) external onlyRole(Role.Teacher) returns (bytes32 key) {
        key = keccak256(abi.encodePacked(examCode, fileHash, block.timestamp));
        require(papers[key].uploadedAt == 0, "Already registered");

        papers[key] = Paper({
            fileHash: fileHash,
            uploadedBy: msg.sender,
            uploadedAt: block.timestamp,
            releaseAt: releaseAt,
            released: false,
            revoked: false,
            examCode: examCode
        });
        paperKeys.push(key);

        emit PaperRegistered(key, examCode, fileHash, msg.sender, releaseAt);
    }

    /// @notice Anyone can verify a freshly-computed hash against the chain
    /// without needing a special role — verification is read-only trust.
    function verifyPaper(bytes32 key, bytes32 recomputedHash) external returns (bool matched) {
        Paper storage p = papers[key];
        require(p.uploadedAt != 0, "Unknown paper");
        matched = (p.fileHash == recomputedHash) && !p.revoked;
        emit PaperVerified(key, matched, msg.sender);
    }

    /// @notice Invigilator marks a paper released once verification passed
    /// and the release time has arrived.
    function releasePaper(bytes32 key) external onlyRole(Role.Invigilator) {
        Paper storage p = papers[key];
        require(p.uploadedAt != 0, "Unknown paper");
        require(!p.revoked, "Paper revoked");
        require(block.timestamp >= p.releaseAt, "Too early to release");
        p.released = true;
        emit PaperReleased(key, msg.sender);
    }

    /// @notice Admin can revoke a paper if leakage or tampering is detected.
    function revokePaper(bytes32 key, string calldata reason) external onlyRole(Role.Admin) {
        require(papers[key].uploadedAt != 0, "Unknown paper");
        papers[key].revoked = true;
        emit PaperRevoked(key, msg.sender, reason);
    }

    function getPaper(bytes32 key) external view returns (Paper memory) {
        return papers[key];
    }

    function totalPapers() external view returns (uint256) {
        return paperKeys.length;
    }
}
