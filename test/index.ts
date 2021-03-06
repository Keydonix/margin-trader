import Jasmine = require('jasmine')
const jasmine = new Jasmine({})
jasmine.randomizeTests(false)

import { Crypto } from '@peculiar/webcrypto'
(global as any).crypto = new Crypto()

import fetch from 'node-fetch'
import { Bytes, Block } from '@zoltu/ethereum-types'
import { rlpEncode, rlpDecode } from '@zoltu/rlp-encoder'
import { keccak256 } from '@zoltu/ethereum-crypto'
import { stripLeadingZeros } from './libraries/utils'
import { createMemoryRpc, SignerFetchRpc } from './libraries/rpc-factories'
import { deploy } from './libraries/deploy-contract'
import { DependenciesImpl } from './libraries/dependencies'
import { Test, TestERC20, UniswapOracle } from './generated/margin-trader'
import { UniswapV2Factory, UniswapV2Pair } from './generated/uniswap'
import { deployUniswap } from "./libraries/deploy-uniswap";

const jsonRpcEndpoint = 'http://localhost:1237'
const gasPrice = 10n*8n

it('block verifier', async () => {
	const rpc = await createMemoryRpc(jsonRpcEndpoint, gasPrice)
	// deploy first to ensure have something other than genesis block as 'latest' block
	const testContractAddress = await deploy(rpc, 'Test.sol', 'Test')
	const testContract = new Test(new DependenciesImpl(rpc), testContractAddress)

	const block = await rpc.getBlockByNumber(false, 'latest')
	if (block === null) throw new Error(`received null latest block from node`)
	// execute a transaction on-chain to force a block minted after the one we just fetched, so blockhash(block.number) works.
	await rpc.sendEth(await rpc.addressProvider(), 0n)
	const rlpBlock = rlpEncodeBlock(block)

	// validate in TypeScript
	const rlpBlockHash = await keccak256.hash(rlpBlock)
	expect(rlpBlockHash).toEqual(block.hash!)

	// validate in Solidity
	const { stateRoot, blockTimestamp } = await testContract.blockVerifier_(rlpBlock)
	expect(stateRoot).toEqual(block.stateRoot)
	expect(blockTimestamp).toEqual(BigInt(block.timestamp.getTime() / 1000))
})

it('account proof', async () => {
	// setup
	const rpc = await createMemoryRpc(jsonRpcEndpoint, gasPrice)
	const testContractAddress = await deploy(rpc, 'Test.sol', 'Test')
	const testContract = new Test(new DependenciesImpl(rpc), testContractAddress)

	// get the thing account proof details
	const block = await rpc.getBlockByNumber(false)
	const proof = await rpc.getProof(testContractAddress, [0n])
	const path = await keccak256.hash(Bytes.fromUnsignedInteger(testContractAddress, 160))
	const encodedNodes = rlpEncode(proof.accountProof.map(rlpDecode))

	// validate the root node and the leaf node in TS, but too lazy to validate everything in-between in TS
	const proofs = rlpDecode(encodedNodes) as readonly (readonly Uint8Array[])[]
	const rootProof = proofs[0]
	const rootProofHash = await keccak256.hash(rlpEncode(rootProof))
	expect(rootProofHash).toEqual(block!.stateRoot)
	const leafProof = proofs[proofs.length - 1]
	const leafProofValue = rlpDecode(leafProof[1])
	expect(Bytes.fromByteArray(leafProofValue[0] as Uint8Array).toUnsignedBigint()).toEqual(proof.nonce)
	expect(Bytes.fromByteArray(leafProofValue[1] as Uint8Array).toUnsignedBigint()).toEqual(proof.balance)
	expect(Bytes.fromByteArray(leafProofValue[2] as Uint8Array).toUnsignedBigint()).toEqual(proof.storageHash)
	expect(Bytes.fromByteArray(leafProofValue[3] as Uint8Array).toUnsignedBigint()).toEqual(proof.codeHash)

	// extract the account proof data with solidity
	const accountDetailsRlp = await testContract.extractMerklePatriciaLeaf_(block!.stateRoot, path, encodedNodes)
	const accountDetails = (rlpDecode(accountDetailsRlp) as Uint8Array[]).map(x => Bytes.fromByteArray(x as Uint8Array).toUnsignedBigint())
	expect(accountDetails[0]).toEqual(proof.nonce)
	expect(accountDetails[1]).toEqual(proof.balance)
	expect(accountDetails[2]).toEqual(proof.storageHash)
	expect(accountDetails[3]).toEqual(proof.codeHash)
})

it('storage proof', async () => {
	// setup
	const rpc = await createMemoryRpc(jsonRpcEndpoint, gasPrice)
	const testContractAddress = await deploy(rpc, 'Test.sol', 'Test')
	const testContract = new Test(new DependenciesImpl(rpc), testContractAddress)

	// get the storage proof details
	const proof = await rpc.getProof(testContractAddress, [0n])
	const accountLeafNode = rlpDecode(proof.accountProof[proof.accountProof.length - 1]) as Uint8Array[]
	const accountLeafNodeValue = rlpDecode(accountLeafNode[1]) as Uint8Array[]
	const storageHash = Bytes.fromByteArray(accountLeafNodeValue[2]).toUnsignedBigint()
	const path = await keccak256.hash(Bytes.fromUnsignedInteger(0n, 256))
	const encodedNodes = rlpEncode(proof.storageProof[0].proof.map(x => rlpDecode(x)))
	const expectedValue = Bytes.fromByteArray([...Bytes.fromUnsignedInteger(11, 32), ...Bytes.fromUnsignedInteger(7, 112), ...Bytes.fromUnsignedInteger(5, 112)]).toUnsignedBigint()

	// extract and validate the data in TS
	const nodes = rlpDecode(encodedNodes) as readonly (readonly Uint8Array[])[]
	const node0Hash = await keccak256.hash(rlpEncode(nodes[0]))
	expect(node0Hash).toEqual(storageHash)
	expect(nodes.length).toEqual(1)
	const leafNode = nodes[0]
	expect(leafNode.length).toEqual(2)
	const leafNodeKey = Bytes.fromByteArray(leafNode[0])
	expect(leafNodeKey.length).toEqual(33)
	const prefixByte = leafNodeKey[0]
	expect(prefixByte).toEqual(0x20)
	const decodedLeafNodeKey = Bytes.fromByteArray(leafNodeKey.slice(1))
	expect(decodedLeafNodeKey.toUnsignedBigint()).toEqual(path)
	const leafNodeValue = Bytes.fromByteArray(rlpDecode(Bytes.fromByteArray(leafNode[1])) as Uint8Array).toUnsignedBigint()
	expect(leafNodeValue).toEqual(expectedValue)

	// extract the leaf node in Solidity
	const storedDataRlp = await testContract.extractMerklePatriciaLeaf_(storageHash, path, encodedNodes)
	const storedData = Bytes.fromByteArray(rlpDecode(storedDataRlp) as Uint8Array)
	expect(storedData.toUnsignedBigint()).toEqual(expectedValue)
})

it('block to storage', async () => {
	// setup
	const rpc = await createMemoryRpc(jsonRpcEndpoint, gasPrice)
	const testContractAddress = await deploy(rpc, 'Test.sol', 'Test')
	const testContract = new Test(new DependenciesImpl(rpc), testContractAddress)

	// get the block
	const block = await rpc.getBlockByNumber(false, 'latest')
	if (block === null) throw new Error(`received null latest block from node`)
	// execute a transaction on-chain to force a block minted after the one we just fetched, so blockhash(block.number) works.
	await rpc.sendEth(await rpc.addressProvider(), 0n)
	const rlpBlock = rlpEncodeBlock(block)

	// account proof details
	const contractAddressHash = await keccak256.hash(Bytes.fromUnsignedInteger(testContractAddress, 160))

	// get the storage proof details
	const proof = await rpc.getProof(testContractAddress, [0n], block.number!)
	const accountNodesRlp = rlpEncode(proof.accountProof.map(rlpDecode))
	const storageSlotHash = await keccak256.hash(Bytes.fromUnsignedInteger(0n, 256))
	const storageNodesRlp = rlpEncode(proof.storageProof[0].proof.map(x => rlpDecode(x)))

	const storedValueRlp = await testContract.verifyBlockAndExtractValue_(rlpBlock, contractAddressHash, accountNodesRlp, storageSlotHash, storageNodesRlp)
	const storedValue = Bytes.fromByteArray(rlpDecode(storedValueRlp) as Uint8Array)
	const expectedValue = Bytes.fromByteArray([...Bytes.fromUnsignedInteger(11, 32), ...Bytes.fromUnsignedInteger(7, 112), ...Bytes.fromUnsignedInteger(5, 112)]).toUnsignedBigint()
	expect(storedValue.toUnsignedBigint()).toEqual(expectedValue)
})

it('UniswapOracle on-chain hashes', async () => {
	// setup
	const rpc = await createMemoryRpc(jsonRpcEndpoint, gasPrice)
	const {uniswapContract} = await createUniswap(rpc)

	// get the block
	const block = await rpc.getBlockByNumber(false, 'latest')
	if (block === null) throw new Error(`received null latest block from node`)
	// execute a transaction on-chain to force a block minted after the one we just fetched, so blockhash(block.number) works.
	await new Promise(resolve => setTimeout(resolve, 1000))
	await rpc.sendEth(await rpc.addressProvider(), 0n)
	const rlpBlock = rlpEncodeBlock(block)

	const uniswapContractAddressHash = await keccak256.hash(Bytes.fromUnsignedInteger(uniswapContract.address, 160))

	// Date is on there for a nonce, is never read by EVM, but
	const uniswapOracleContractAddress = await deploy(rpc, 'UniswapOracle.sol', 'UniswapOracle', ["address", "uint256", "uint256"], [uniswapContract.address, 1n, BigInt(Date.now()) ])
	const uniswapOracleContract = new UniswapOracle(new DependenciesImpl(rpc), uniswapOracleContractAddress)

	// check hash created in constructor
	const storedUniswapContractAddressHash = await uniswapOracleContract.uniswapV2PairHash_()
	expect(storedUniswapContractAddressHash).toEqual(uniswapContractAddressHash)

	// check constant hashes, generate proofs
	const reserveTimestampSlotProof = await rpc.getProof(uniswapContract.address, [8n], block.number!)
	const accountNodesRlp = rlpEncode(reserveTimestampSlotProof.accountProof.map(rlpDecode))
	const constantReserveTimestampSlotHash = await uniswapOracleContract.reserveTimestampSlotHash_()
	const reserveTimestampSlotStorageNodesRlp = rlpEncode(reserveTimestampSlotProof.storageProof[0].proof.map(x => rlpDecode(x)))
	expect(constantReserveTimestampSlotHash).toEqual(await keccak256.hash(Bytes.fromUnsignedInteger(8n, 256)))

	const price0SlotProof = await rpc.getProof(uniswapContract.address, [9n], block.number!)
	const constantPrice0SlotHash = await uniswapOracleContract.price0SlotHash_()
	const price0SlotStorageNodesRlp = rlpEncode(price0SlotProof.storageProof[0].proof.map(x => rlpDecode(x)))
	expect(constantPrice0SlotHash).toEqual(await keccak256.hash(Bytes.fromUnsignedInteger(9n, 256)))

	const rawStorageValue = (await rpc.getStorageAt(uniswapContract.address, 9n)).toUnsignedBigint()
	const price = await uniswapOracleContract.getPrice_(rlpBlock, accountNodesRlp, reserveTimestampSlotStorageNodesRlp, price0SlotStorageNodesRlp)
	expect(price).toEqual(rawStorageValue)
})

it('timestamp', async () => {
	const rpc = await createMemoryRpc(jsonRpcEndpoint, gasPrice)
	const selfAddress = await rpc.addressProvider()
	const latestBlockTimestamp = (await rpc.getBlockByNumber(false, 'latest'))!.timestamp.getTime() / 1000

	await fetch(`http://localhost:12340/${latestBlockTimestamp + 10}`)
	await rpc.sendEth(selfAddress, 0n)
	const firstBlock = await rpc.getBlockByNumber(false, 'latest')
	expect(firstBlock!.timestamp).toEqual(new Date((latestBlockTimestamp + 10) * 1000))

	await fetch(`http://localhost:12340/${latestBlockTimestamp + 100}`)
	await rpc.sendEth(selfAddress, 0n)
	const secondBlock = await rpc.getBlockByNumber(false, 'latest')
	expect(secondBlock!.timestamp.getTime()).toEqual((latestBlockTimestamp + 100) * 1000)
})

jasmine.execute()

function rlpEncodeBlock(block: Block) {
	return rlpEncode([
		Bytes.fromUnsignedInteger(block.parentHash, 256),
		Bytes.fromUnsignedInteger(block.sha3Uncles, 256),
		Bytes.fromUnsignedInteger(block.miner, 160),
		Bytes.fromUnsignedInteger(block.stateRoot, 256),
		Bytes.fromUnsignedInteger(block.transactionsRoot, 256),
		Bytes.fromUnsignedInteger(block.receiptsRoot, 256),
		Bytes.fromUnsignedInteger(block.logsBloom!, 2048),
		stripLeadingZeros(Bytes.fromUnsignedInteger(block.difficulty, 256)),
		stripLeadingZeros(Bytes.fromUnsignedInteger(block.number!, 256)),
		stripLeadingZeros(Bytes.fromUnsignedInteger(block.gasLimit, 256)),
		stripLeadingZeros(Bytes.fromUnsignedInteger(block.gasUsed, 256)),
		stripLeadingZeros(Bytes.fromUnsignedInteger(block.timestamp.getTime() / 1000, 256)),
		stripLeadingZeros(block.extraData),
		...(block.mixHash !== null ? [Bytes.fromUnsignedInteger(block.mixHash, 256)] : []),
		...(block.nonce !== null ? [Bytes.fromUnsignedInteger(block.nonce!, 64)] : []),
	])
}

async function createUniswap(rpc: SignerFetchRpc) {
	const uniswapFactoryContractAddress = await deployUniswap(rpc)
	const uniswapFactoryContract = new UniswapV2Factory(new DependenciesImpl(rpc), uniswapFactoryContractAddress)

	const token0 = await deploy(rpc, 'TestERC20.sol', 'TestERC20', ["string", "string"], ["DAI-" + Date.now(), "DAI"])
	const token1 = await deploy(rpc, 'TestERC20.sol', 'TestERC20', ["string", "string"], ["WETH-" + Date.now(), "WETH"])
	const token0Contract = new TestERC20(new DependenciesImpl(rpc), token0)
	const token1Contract = new TestERC20(new DependenciesImpl(rpc), token1)


	let uniswapContractAddress = await uniswapFactoryContract.getPair_(token0, token1);
	if (uniswapContractAddress === 0n) {
		await uniswapFactoryContract.createPair(token0, token1)
		uniswapContractAddress = await uniswapFactoryContract.getPair_(token0, token1);
	}
	const uniswapContract = new UniswapV2Pair(new DependenciesImpl(rpc), uniswapContractAddress)

	await token0Contract.mint(1800000000000000000n)
	await token1Contract.mint(2000000000000000000n)

	await token0Contract.transfer(uniswapContractAddress, 900000000000000000n)
	await token1Contract.transfer(uniswapContractAddress, 1000000000000000000n)
	await uniswapContract.mint(await rpc.addressProvider())

	// TODO Ganache
	await new Promise((resolve) => setTimeout(resolve, 1000))
	await token0Contract.transfer(uniswapContractAddress, 900000000000000000n)
	await token1Contract.transfer(uniswapContractAddress, 1000000000000000000n)
	await uniswapContract.mint(await rpc.addressProvider())

	return {token0Contract, token1Contract, uniswapContract};
}
