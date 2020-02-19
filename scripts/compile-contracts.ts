import { promises as filesystem } from 'fs'
import * as path from 'path'
import { AbiFunction, AbiEvent } from 'ethereum'
import { CompilerOutput, CompilerInput, compile, CompilerOutputContractFile } from 'solc'
import { generateContractInterfaces } from '@zoltu/solidity-typescript-generator'

export async function ensureDirectoryExists(absoluteDirectoryPath: string) {
	try {
		await filesystem.mkdir(absoluteDirectoryPath)
	} catch (error) {
		if (error.code === 'EEXIST') return
		throw error
	}
}

async function compileContracts(): Promise<[CompilerInput, CompilerOutput]> {
	const solidityFilePath = path.join(__dirname, '..', 'contracts', 'source', 'margin-trader.sol')
	const soliditySourceCode = await filesystem.readFile(solidityFilePath, 'utf8')
	const compilerInput: CompilerInput = {
		language: "Solidity",
		settings: {
			optimizer: {
				enabled: true,
				runs: 500
			},
			outputSelection: {
				"*": {
					'*': [ 'abi', 'metadata', 'evm.bytecode.object', 'evm.bytecode.sourceMap', 'evm.deployedBytecode.object', 'evm.gasEstimates' ]
				}
			}
		},
		sources: {
			'margin-trader.sol': {
				content: soliditySourceCode
			}
		}
	}
	const compilerInputJson = JSON.stringify(compilerInput)
	const compilerOutputJson = compile(compilerInputJson)
	const compilerOutput = JSON.parse(compilerOutputJson) as CompilerOutput
	const errors = compilerOutput.errors
	if (errors) {
		let concatenatedErrors = "";

		for (let error of errors) {
			concatenatedErrors += error.formattedMessage + "\n";
		}

		if (concatenatedErrors.length > 0) {
			throw new Error("The following errors/warnings were returned by solc:\n\n" + concatenatedErrors);
		}
	}

	return [compilerInput, compilerOutput]
}

async function writeCompilerInput(input: CompilerInput) {
	await ensureDirectoryExists(path.join(__dirname, '..', 'contracts', 'output'))
	const filePath = path.join(__dirname, '..', 'contracts', 'output', 'margin-trader-input.json')
	const fileContents = JSON.stringify(input, undefined, '\t')
	return await filesystem.writeFile(filePath, fileContents, { encoding: 'utf8', flag: 'w' })
}

async function writeCompilerOutput(output: CompilerOutput) {
	await ensureDirectoryExists(path.join(__dirname, '..', 'contracts', 'output'))
	const filePath = path.join(__dirname, '..', 'contracts', 'output', 'margin-trader-output.json')
	const fileContents = JSON.stringify(output, undefined, '\t')
	return await filesystem.writeFile(filePath, fileContents, { encoding: 'utf8', flag: 'w' })
}

async function writeJson(abi: (AbiFunction | AbiEvent)[]) {
	await ensureDirectoryExists(path.join(__dirname, '..', 'contracts', 'output'))
	const filePath = path.join(__dirname, '..', 'contracts', 'output', 'margin-trader-abi.json')
	const fileContents = JSON.stringify(abi, undefined, '\t')
	return await filesystem.writeFile(filePath, fileContents, { encoding: 'utf8', flag: 'w' })
}

async function writeGeneratedInterface(compilerOutput: CompilerOutput) {
	const dappFilePath = path.join(__dirname, '..', 'dapp', 'ts', 'generated', 'margin-trader.ts')
	const testFilePath = path.join(__dirname, '..', 'test', 'generated', 'margin-trader.ts')
	await ensureDirectoryExists(path.dirname(dappFilePath))
	await ensureDirectoryExists(path.dirname(testFilePath))
	const fileContents = await generateContractInterfaces(compilerOutput)
	await filesystem.writeFile(dappFilePath, fileContents, { encoding: 'utf8', flag: 'w' })
	await filesystem.writeFile(testFilePath, fileContents, { encoding: 'utf8', flag: 'w' })
}

async function writeBytecode(contracts: CompilerOutputContractFile) {
	await ensureDirectoryExists(path.join(__dirname, '..', 'contracts', '/output/'))
	for (let contractName in contracts) {
		const filePath = path.join(__dirname, '..', 'contracts', 'output', `${contractName}-bytecode.txt`)
		const fileContents = contracts[contractName].evm.bytecode.object
		await filesystem.writeFile(filePath, fileContents, { encoding: 'utf8', flag: 'w' })
	}
}

async function doStuff() {
	const [compilerInput, compilerOutput] = await compileContracts()
	const contracts = compilerOutput.contracts['margin-trader.sol']
	await writeCompilerInput(compilerInput)
	await writeCompilerOutput(compilerOutput)
	await writeJson(contracts.MarginTrader.abi)
	await writeGeneratedInterface(compilerOutput)
	await writeBytecode(contracts)
}

doStuff().then(() => {
	process.exit(0)
}).catch(error => {
	console.error(error)
	process.exit(1)
})
