pragma solidity 0.6.3;

import { BlockVerifier } from "./BlockVerifier.sol";
import { MerklePatritiaVerifier } from "./MerklePatritiaVerifier.sol";
import { Rlp } from "./Rlp.sol";

contract Test {
	uint112 apple = 5;
	uint112 banana = 7;
	uint32 cherry = 11;

	function blockVerifier(bytes memory historicBlock) public returns (bytes32 stateRoot, uint256 blockTimestamp) {
		apple = 5;
		(stateRoot, blockTimestamp) = BlockVerifier.extractStateRootAndTimestamp(historicBlock);
	}

	function extractMerklePatritiaLeaf(bytes32 expectedRoot, bytes32 path, bytes memory proofNodesRlp) public returns (bytes memory) {
		apple = 5;
		return MerklePatritiaVerifier.getValueFromProof(expectedRoot, path, proofNodesRlp);
	}

	function verifyBlockAndExtractValue(bytes memory historicBlock, bytes32 contractAddressHash, bytes memory accountNodesRlp, bytes32 storageSlotHash, bytes memory storageNodesRlp) public returns (bytes memory) {
		apple = 5;
		(bytes32 stateRoot,) = BlockVerifier.extractStateRootAndTimestamp(historicBlock);
		bytes memory accountDetailsBytes = MerklePatritiaVerifier.getValueFromProof(stateRoot, contractAddressHash, accountNodesRlp);
		Rlp.Item[] memory accountDetails = Rlp.toList(Rlp.toItem(accountDetailsBytes));
		bytes32 storageRootHash = Rlp.toBytes32(accountDetails[2]);
		return MerklePatritiaVerifier.getValueFromProof(storageRootHash, storageSlotHash, storageNodesRlp);
	}
}
