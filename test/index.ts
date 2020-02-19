import Jasmine = require('jasmine');
const jasmine = new Jasmine({})
jasmine.randomizeTests(false)

import { Crypto } from '@peculiar/webcrypto'
(global as any).crypto = new Crypto()

it('works', async () => {
	expect(true).toBeTruthy()
})

jasmine.execute()
