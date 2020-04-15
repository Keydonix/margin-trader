import * as path from 'path'
import { promises as filesystem } from 'fs'
import { Bytes,EncodableArray  } from '@zoltu/ethereum-types'
import { keccak256 } from '@zoltu/ethereum-crypto'
import { SignerFetchRpc } from './rpc-factories'
import { encodeParameters } from "@zoltu/ethereum-abi-encoder";

const proxyDeployerAddress = 0x7a0d94f55792c434d74a40883c6ed8545e406d12n

async function ensureProxyDeployerDeployed(rpc: SignerFetchRpc): Promise<void> {
	const deployerBytecode = await rpc.getCode(proxyDeployerAddress)
	if (deployerBytecode.equals(Bytes.fromHexString('0x60003681823780368234f58015156014578182fd5b80825250506014600cf3'))) return

	await rpc.sendEth(0x4c8d290a1b368ac4728d83a9e8321fc3af2b39b1n, 10000000000000000n)
	await rpc.sendRawTransaction(Bytes.fromHexString('0xf87e8085174876e800830186a08080ad601f80600e600039806000f350fe60003681823780368234f58015156014578182fd5b80825250506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222'))
}

export async function deploy(rpc: SignerFetchRpc, fileName: string, contractName: string, constructorParameterTypes: string[] = [], constructorParameters: EncodableArray = []) {
	await ensureProxyDeployerDeployed(rpc)

	const deploymentBytecode = await getDeploymentBytecode(fileName, contractName, constructorParameterTypes, constructorParameters)
	const expectedDeployedBytecode = await getDeployedBytecode(fileName, contractName)
	const marginTraderAddress = await getDeploymentAddress(fileName, contractName, constructorParameterTypes, constructorParameters)
	const deployedBytecode = await rpc.getCode(marginTraderAddress)
	if (deployedBytecode.equals(expectedDeployedBytecode)) return marginTraderAddress

	await rpc.sendTransaction({ to: proxyDeployerAddress, data: deploymentBytecode })
	return marginTraderAddress
}

async function getDeploymentBytecode(fileName: string, contractName: string, constructorParameterTypes: string[], constructorParameters: EncodableArray) {
	const compilerOutput = await getCompilerOutput()
	const deploymentBytecodeString = compilerOutput.contracts[fileName][contractName].evm.bytecode.object
	const encodedConstructorParameters = encodeParameters(constructorParameterTypes.map(x => ({ name: '', type: x })), constructorParameters)
	return Bytes.fromByteArray([...Bytes.fromHexString(deploymentBytecodeString), ...encodedConstructorParameters])
}

async function getDeployedBytecode(fileName: string, contractName: string) {
	const compilerOutput = await getCompilerOutput()
	const deployedBytecodeString = compilerOutput.contracts[fileName][contractName].evm.deployedBytecode.object
	return Bytes.fromHexString(deployedBytecodeString)
}

async function getDeploymentAddress(fileName: string, contractName: string, constructorParameterTypes: string[] = [], constructorParameters: EncodableArray = []) {
	const deploymentBytecode = await getDeploymentBytecode(fileName, contractName, constructorParameterTypes, constructorParameters)
	const salt = 0n
	const deploymentBytecodeHash = await keccak256.hash(deploymentBytecode)
	return await keccak256.hash([0xff, ...Bytes.fromUnsignedInteger(proxyDeployerAddress, 160), ...Bytes.fromUnsignedInteger(salt, 256), ...Bytes.fromUnsignedInteger(deploymentBytecodeHash, 256)]) & 0xffffffffffffffffffffffffffffffffffffffffn
}

let memoizedMarginTraderCompilerOutput: string | undefined
async function getCompilerOutput() {
	const compilerOutputJsonPath = path.join(__dirname, '..', '..', 'contracts', 'output', 'margin-trader-output.json')
	const compilerOutputJsonString = memoizedMarginTraderCompilerOutput || await filesystem.readFile(compilerOutputJsonPath, 'utf8')
	return JSON.parse(compilerOutputJsonString)
}
