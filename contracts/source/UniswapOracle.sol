pragma solidity 0.6.3;

import { BlockVerifier } from "./BlockVerifier.sol";
import { MerklePatritiaVerifier } from "./MerklePatritiaVerifier.sol";
import { Rlp } from "./Rlp.sol";
import { IUniswapV2Pair } from "./IUniswapV2Pair.sol";
import { UQ112x112 } from "./UQ112x112.sol";

contract UniswapOracle {
	using UQ112x112 for uint224;

	uint256 private MIN_BLOCK_COUNT;
	bytes32 public constant reserveTimestampSlotHash = keccak256(abi.encodePacked(uint256(8)));
	bytes32 public constant price0SlotHash = keccak256(abi.encodePacked(uint256(9)));

	IUniswapV2Pair public uniswapV2Pair;
	bytes32 public uniswapV2PairHash;

	constructor(IUniswapV2Pair _uniswapV2Pair, uint256 minBlockCount) public {
		MIN_BLOCK_COUNT = minBlockCount;
		uniswapV2Pair = _uniswapV2Pair;
		uniswapV2PairHash = keccak256(abi.encodePacked(_uniswapV2Pair));
	}

	function getAccountStorageRoot(bytes memory historicBlock, bytes memory accountNodesRlp) public view returns (bytes32 storageRootHash, uint256 blockTimestamp) {
		bytes32 stateRoot;
		uint256 blockNumber;
		(stateRoot, blockTimestamp, blockNumber) = BlockVerifier.extractStateRootAndTimestamp(historicBlock);
		require (blockNumber < block.number - MIN_BLOCK_COUNT, "Proof does not cover enough blocks");
		bytes memory accountDetailsBytes = MerklePatritiaVerifier.getValueFromProof(stateRoot, uniswapV2PairHash, accountNodesRlp);
		Rlp.Item[] memory accountDetails = Rlp.toList(Rlp.toItem(accountDetailsBytes));
		return (Rlp.toBytes32(accountDetails[2]), blockTimestamp);
	}

	// This function verifies the full block is old enough (MIN_BLOCK_COUNT), not too old (or blockhash will return 0x0)
	// and return the proof values for the two storage slots we care about
	function verifyBlockAndExtractReserveData(bytes memory historicBlock, bytes memory accountNodesRlp, bytes memory reserveTimestampProofNodesRlp, bytes memory price0ProofNodesRlp) public view returns
		(uint256 blockTimestamp, uint256 price0CumulativeLast, uint112 reserve0, uint112 reserve1, uint256 reserveTimestamp) {
		bytes32 storageRootHash;
		(storageRootHash, blockTimestamp) = getAccountStorageRoot(historicBlock, accountNodesRlp);
		price0CumulativeLast = rlpBytesToUint256(MerklePatritiaVerifier.getValueFromProof(storageRootHash, price0SlotHash, price0ProofNodesRlp));
		uint256 reserve0Reserve1TimestampPacked = rlpBytesToUint256(MerklePatritiaVerifier.getValueFromProof(storageRootHash, reserveTimestampSlotHash, reserveTimestampProofNodesRlp));
		reserveTimestamp = reserve0Reserve1TimestampPacked >> (112 + 112);
		reserve1 = uint112((reserve0Reserve1TimestampPacked >> 112) & (2**112 - 1));
		reserve0 = uint112(reserve0Reserve1TimestampPacked & (2**112 - 1));
	}

	function getPrice(bytes memory historicBlock, bytes memory accountNodesRlp, bytes memory reserveTimestampProofNodesRlp, bytes memory price0ProofNodesRlp) public view returns (uint256 price){
		(uint256 historicBlockTimestamp, uint256 historicPrice0CumulativeLast, uint112 reserve0, uint112 reserve1, uint256 reserveTimestamp) = verifyBlockAndExtractReserveData(historicBlock, accountNodesRlp, reserveTimestampProofNodesRlp, price0ProofNodesRlp);
		uint256 secondsBetweenReserveUpdateAndHistoricBlock = historicBlockTimestamp - reserveTimestamp;
		// bring old record up-to-date, in case there was no cumulative update in provided historic block itself
		if (secondsBetweenReserveUpdateAndHistoricBlock > 0) {
			historicPrice0CumulativeLast += uint(UQ112x112.encode(reserve1).uqdiv(reserve0)) * secondsBetweenReserveUpdateAndHistoricBlock;
		}
		uint256 secondsBetweenProvidedBlockAndNow = block.timestamp - historicBlockTimestamp;
		return (getCurrentPrice0CumulativeLast() - historicPrice0CumulativeLast) / secondsBetweenProvidedBlockAndNow;
	}

	function getCurrentPrice0CumulativeLast() public view returns (uint256 price0CumulativeLast) {
		(uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = uniswapV2Pair.getReserves();
		price0CumulativeLast = uniswapV2Pair.price0CumulativeLast();
		uint256 timeElapsed = block.timestamp - blockTimestampLast;
		if (timeElapsed > 0) {
			price0CumulativeLast += uint(UQ112x112.encode(reserve1).uqdiv(reserve0)) * timeElapsed;
		}
	}

	function rlpBytesToUint256(bytes memory source) internal pure returns (uint256 result) {
		// an extra byte is in there for the rlp encoding
		assembly {
			result := mload(add(source, 33))
		}
	}
}
