pragma solidity 0.6.3;
pragma experimental ABIEncoderV2;

import { BlockVerifier } from "./BlockVerifier.sol";
import { MerklePatritiaVerifier } from "./MerklePatritiaVerifier.sol";
import { Rlp } from "./Rlp.sol";
import { IUniswapV2Pair } from "./IUniswapV2Pair.sol";

contract UniswapOracle {
	uint256 private constant MIN_BLOCK_COUNT = 192;
	IUniswapV2Pair public uniswapV2Pair;
//	mapping (IUniswapV2 => mapping (uint256 => FeedDetails)) feed;

	constructor(IUniswapV2Pair _uniswapV2Pair) public {
		uniswapV2Pair = _uniswapV2Pair;
	}

	function greeting() public pure returns (string memory) {
		return "hello";
	}

	function verifyBlockAndExtractValue(bytes memory historicBlock, bytes32 contractAddressHash, bytes memory accountNodesRlp, bytes32[] memory storageSlotHash, bytes[] memory storageNodesRlp) public view returns (bytes memory) {
		(bytes32 stateRoot,, uint256 blockNumber) = BlockVerifier.extractStateRootAndTimestamp(historicBlock);
		require(blockNumber < block.number - MIN_BLOCK_COUNT);
		bytes memory accountDetailsBytes = MerklePatritiaVerifier.getValueFromProof(stateRoot, contractAddressHash, accountNodesRlp);
		Rlp.Item[] memory accountDetails = Rlp.toList(Rlp.toItem(accountDetailsBytes));
		bytes32 storageRootHash = Rlp.toBytes32(accountDetails[2]);
		return MerklePatritiaVerifier.getValueFromProof(storageRootHash, storageSlotHash[0], storageNodesRlp[0]);
	}
}
