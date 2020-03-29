import * as path from 'path'
import { promises as fs } from 'fs'
import { recursiveDirectoryCopy } from '@zoltu/file-copier'

const dependencyPaths = [
	// @pika/react is just react packaged for ES, so we just map 'react' to it at runtime
	[ '@pika/react', 'react', '', 'source.development.js' ],
	[ '@pika/react-dom', 'react-dom', '', 'source.development.js' ],
	[ '@zoltu/ethereum-abi-encoder', undefined, 'output-es', 'index.js' ],
	[ '@zoltu/ethereum-crypto', undefined, 'output-es', 'index.js' ],
	[ '@zoltu/ethereum-fetch-json-rpc', undefined, 'output-es', 'index.js' ],
	[ '@zoltu/ethereum-types', undefined, 'output-es', 'index.js' ],
	[ 'es-module-shims', undefined, 'dist', 'es-module-shims.min.js' ],
] as const

const indexFilePath = path.join(__dirname, '..', 'dapp', 'index.html')

async function vendorDependencies() {
	for (const [name, targetName, subfolder] of dependencyPaths) {
		const sourceDirectoryPath = path.join(__dirname, '..', 'node_modules', name, subfolder)
		const destinationDirectoryPath = path.join(__dirname, '..', 'dapp', 'vendor', targetName || name)
		await recursiveDirectoryCopy(sourceDirectoryPath, destinationDirectoryPath, undefined, fixSourceMap)
	}

	const indexHtmlPath = path.join(indexFilePath)
	const oldIndexHtml = await fs.readFile(indexHtmlPath, 'utf8')
	const importmap = dependencyPaths.reduce((importmap, [name, targetName, , file]) => {
		importmap.imports[targetName || name ] = `./${path.join('.', 'vendor', name, file).replace(/\\/g, '/')}`
		return importmap
	}, { imports: {} as Record<string, string> })
	const importmapJson = JSON.stringify(importmap, undefined, '\t')
		.replace(/^/mg, '\t\t')
	const newIndexHtml = oldIndexHtml.replace(/<script type='importmap-shim'>[\s\S]*?<\/script>/m, `<script type='importmap-shim'>\n${importmapJson}\n\t</script>`)
	await fs.writeFile(indexHtmlPath, newIndexHtml)
}

// https://bugs.chromium.org/p/chromium/issues/detail?id=979000
async function fixSourceMap(filePath: string) {
	const fileExtension = path.extname(filePath)
	if (fileExtension !== '.map') return
	const fileDirectoryName = path.basename(path.dirname(path.dirname(filePath)))
	const fileName = path.parse(path.parse(filePath).name).name
	const fileContents = JSON.parse(await fs.readFile(filePath, 'utf-8')) as { sources: Array<string> }
	for (let i = 0; i < fileContents.sources.length; ++i) {
		fileContents.sources[i] = (fileName === 'index')
			? `./${fileDirectoryName}.ts`
			: `./${fileName}.ts`
	}
	await fs.writeFile(filePath, JSON.stringify(fileContents))
}

if (require.main === module) {
	vendorDependencies().catch(error => {
		console.error(error.message)
		console.error(error)
		process.exit(1)
	})
}
