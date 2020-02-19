import Jasmine = require('jasmine')
const jasmine = new Jasmine({})
jasmine.randomizeTests(false)

import { Crypto } from '@peculiar/webcrypto'
(global as any).crypto = new Crypto()

import { createMemoryRpc } from './libraries/rpc-factories'
import { deployMarginTrader } from './libraries/deploy-margin-trader'
import { MarginTrader } from './generated/margin-trader'
import { DependenciesImpl } from './libraries/dependencies'

const jsonRpcEndpoint = 'http://localhost:1235'
const gasPrice = 10n*8n

it('deploys', async () => {
	const rpc = await createMemoryRpc(jsonRpcEndpoint, gasPrice)
	const marginTraderAddress = await deployMarginTrader(rpc)
	const marginTrader = new MarginTrader(new DependenciesImpl(rpc), marginTraderAddress)
	const greeting = await marginTrader.greeting_()
	expect(greeting).toEqual('hello')
})

jasmine.execute()
