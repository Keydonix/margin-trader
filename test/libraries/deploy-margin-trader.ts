import { promises as filesystem } from 'fs'
import * as path from 'path'
import { SignerFetchRpc } from './rpc-factories'
import { Bytes } from '@zoltu/ethereum-types'
import { keccak256 } from '@zoltu/ethereum-crypto'

async function ensureProxyDeployerDeployed(rpc: SignerFetchRpc): Promise<void> {
	const deployerBytecode = await rpc.getCode(0x7a0d94f55792c434d74a40883c6ed8545e406d12n)
	if (deployerBytecode.equals(Bytes.fromHexString('0x60003681823780368234f58015156014578182fd5b80825250506014600cf3'))) return

	await rpc.sendEth(0x4c8d290a1b368ac4728d83a9e8321fc3af2b39b1n, 10000000000000000n)
	await rpc.sendRawTransaction(Bytes.fromHexString('0xf87e8085174876e800830186a08080ad601f80600e600039806000f350fe60003681823780368234f58015156014578182fd5b80825250506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222'))
}

export async function deployMarginTrader(rpc: SignerFetchRpc) {
	await ensureProxyDeployerDeployed(rpc)

	const deploymentBytecode = await getMarginTraderDeploymentBytecode()
	const expectedDeployedBytecode = await getMarginTraderDeployedBytecode()
	const marginTraderAddress = await getMarginTraderDeploymentAddress()
	const deployedBytecode = await rpc.getCode(marginTraderAddress)
	if (deployedBytecode.equals(expectedDeployedBytecode)) return marginTraderAddress

	await rpc.sendTransaction({ to: 0x7a0d94f55792c434d74a40883c6ed8545e406d12n, data: deploymentBytecode })
	return marginTraderAddress
}

async function getMarginTraderDeploymentBytecode() {
	const compilerOutput = await getMarginTraderCompilerOutput()
	const deploymentBytecodeString = compilerOutput.contracts['margin-trader.sol']['MarginTrader'].evm.bytecode.object
	return Bytes.fromHexString(deploymentBytecodeString)
}

async function getMarginTraderDeployedBytecode() {
	const compilerOutput = await getMarginTraderCompilerOutput()
	const deployedBytecodeString = compilerOutput.contracts['margin-trader.sol']['MarginTrader'].evm.deployedBytecode.object
	return Bytes.fromHexString(deployedBytecodeString)
}

async function getMarginTraderDeploymentAddress() {
	const deploymentBytecode = await getMarginTraderDeploymentBytecode()
	const deployerAddress = 0x7a0d94f55792c434d74a40883c6ed8545e406d12n
	const salt = 0n
	const deploymentBytecodeHash = await keccak256.hash(deploymentBytecode)
	return await keccak256.hash([0xff, ...Bytes.fromUnsignedInteger(deployerAddress, 160), ...Bytes.fromUnsignedInteger(salt, 256), ...Bytes.fromUnsignedInteger(deploymentBytecodeHash, 256)]) & 0xffffffffffffffffffffffffffffffffffffffffn
}

let memoizedMarginTraderCompilerOutput: string | undefined
async function getMarginTraderCompilerOutput() {
	const compilerOutputJsonPath = path.join(__dirname, '..', '..', 'contracts', 'output', 'margin-trader-output.json')
	const compilerOutputJsonString = memoizedMarginTraderCompilerOutput || await filesystem.readFile(compilerOutputJsonPath, 'utf8')
	return JSON.parse(compilerOutputJsonString)
}
