import { createOnChangeProxy } from './library/proxy'
import { AppModel, App, AccountModel } from './components/App'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { EthereumBrowserDependencies } from './library/ethereum-browser-dependencies';
import { MarginTrader, UniswapOracle } from './generated/margin-trader';
import { UniswapV2Pair } from './generated/uniswap';
import { asyncState, asyncStateOnce } from './library/react-utilities';
import { ethereum } from '@zoltu/ethereum-crypto';

const jsonRpcAddress = 'http://localhost:1235'
// const jsonRpcAddress = 'https://ethereum.keydonix.com'
const dependencies = new EthereumBrowserDependencies(jsonRpcAddress)
const uniswap = new UniswapV2Pair(dependencies, 0x0n)
uniswap
const uniswapOracle = new UniswapOracle(dependencies, 0x0n)
uniswapOracle
const marginTrader = new MarginTrader(dependencies, 0x0n)
marginTrader

async function main() {
	// create our root model as a proxy object that will auto-rerender anytime its properties (recursively) change
	const rootModel = createOnChangeProxy<AppModel>(render, {
		promptForAccountAccess: asyncState(promptForAccountAccess, account => { rootModel.account = account }),
		account: { state: 'resolved', value: undefined },
	})

	// put the root model on the window for debugging convenience
	;(window as any).rootModel = rootModel

	// find the HTML element we will attach to
	const main = document.querySelector('main')

	// specify our render function, which will be fired anytime rootModel is mutated
	function render() {
		const element = React.createElement(App, rootModel)
		ReactDOM.render(element, main)
	}

	// kick off the initial render
	render()
}
main().catch(console.error)

async function promptForAccountAccess(): Promise<AccountModel | undefined> {
	await dependencies.enable()
	if (!dependencies.enabled) return undefined
	// TODO: re-request accounts in case we are coming in
	if (dependencies.address === undefined) return undefined
	const addressString = await ethereum.addressToChecksummedString(dependencies.address)
	const account: AccountModel = {
		refresh: () => {
			asyncState(getAttoethBalance, attoeth => { account.attoethBalance = attoeth })
			asyncState(getAttodaiBalance, attodai => { account.attodaiBalance = attodai })
		},
		address: { number: dependencies.address, string: addressString },
		attoethBalance: asyncStateOnce(getAttoethBalance, attoeth => { account.attoethBalance = attoeth }),
		attodaiBalance: asyncStateOnce(getAttodaiBalance, attodai => { account.attodaiBalance = attodai }),
	}
	return account
}

async function getAttoethBalance(): Promise<bigint> {
	return 5n ** 18n
}

async function getAttodaiBalance(): Promise<bigint> {
	return 100n ** 18n
}
