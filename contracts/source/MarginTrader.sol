pragma solidity 0.6.3;

import "./UniswapOracle.sol";

contract MarginTrader is UniswapOracle {
	constructor(IUniswapV2Pair _uniswapV2Pair, uint256 _minBlockCount) public UniswapOracle(_uniswapV2Pair, _minBlockCount) {
	}

	function increasePosition(uint256 leverage, uint256 amount, bytes memory historicBlock, bytes memory accountNodesRlp, bytes memory reserveTimestampProofNodesRlp, bytes memory price0ProofNodesRlp) public view returns (string memory) {
		leverage; amount;
		uint256 price = UniswapOracle.getPrice(historicBlock, accountNodesRlp, reserveTimestampProofNodesRlp, price0ProofNodesRlp);
		price;
		// Proceed with work, check position vs calculated price
	}
}
