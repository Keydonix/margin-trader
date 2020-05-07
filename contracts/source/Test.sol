pragma solidity 0.6.3;
pragma experimental ABIEncoderV2;

import { BlockVerifier } from "./BlockVerifier.sol";
import { MerklePatriciaVerifier } from "./MerklePatriciaVerifier.sol";
import { Rlp } from "./Rlp.sol";

contract Test {
	uint112 apple = 5;
	uint112 banana = 7;
	uint32 cherry = 11;

	function blockVerifier(bytes memory historicBlock) public returns (bytes32 stateRoot, uint256 blockTimestamp) {
		apple = 5;
		(stateRoot, blockTimestamp,) = BlockVerifier.extractStateRootAndTimestamp(historicBlock);
	}

	function extractMerklePatriciaLeaf(bytes32 expectedRoot, bytes32 path, bytes memory proofNodesRlp) public returns (bytes memory) {
		apple = 5;
		return MerklePatriciaVerifier.getValueFromProof(expectedRoot, path, proofNodesRlp);
	}

	function verifyBlockAndExtractValue(bytes memory historicBlock, bytes32 contractAddressHash, bytes memory accountNodesRlp, bytes32 storageSlotHash, bytes memory storageNodesRlp) public returns (bytes memory) {
		apple = 5;
		(bytes32 stateRoot,,) = BlockVerifier.extractStateRootAndTimestamp(historicBlock);
		bytes memory accountDetailsBytes = MerklePatriciaVerifier.getValueFromProof(stateRoot, contractAddressHash, accountNodesRlp);
		Rlp.Item[] memory accountDetails = Rlp.toList(Rlp.toItem(accountDetailsBytes));
		bytes32 storageRootHash = Rlp.toBytes32(accountDetails[2]);
		return MerklePatriciaVerifier.getValueFromProof(storageRootHash, storageSlotHash, storageNodesRlp);
	}
}
