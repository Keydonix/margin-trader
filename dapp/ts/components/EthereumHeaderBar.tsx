import * as React from 'react'
import { Spinner } from './Spinner'
import { AppModel } from './App'

export interface EthereumHeaderBarModel {
	readonly promptForAccountAccess: () => void
	account: AppModel['account']
}

export function EthereumHeaderBar(model: Readonly<EthereumHeaderBarModel>) {
	return model.account.state === 'rejected' ? <Error error={model.account.error} promptForAccountAccess={model.promptForAccountAccess}/>
		: model.account.state === 'pending' ? <Spinner/>
		: model.account.state === 'resolved' && model.account.value !== undefined ? <AddressDisplay address={model.account.value.address}/>
		: <Prompt promptForAccountAccess={model.promptForAccountAccess}/>
}

const Warning = () => <img src='./images/warning.png' style={{ flexShrink: 0, padding: '5px' }}/>

const Error = ({ error, promptForAccountAccess }: { error: Error, promptForAccountAccess: EthereumHeaderBarModel['promptForAccountAccess'] }) =>
	<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px' }}>
		<Warning/>
		<div style={{ flexShrink: 1, textAlign: 'center', padding: '5px' }}>
			<p>Error: {error.message}</p>
			<span style={{ cursor: 'pointer', color: '#fb887c', whiteSpace: 'nowrap' }} onClick={promptForAccountAccess}>Prompt for account access.</span>
		</div>
		<Warning/>
	</div>

const Prompt = ({ promptForAccountAccess }: { promptForAccountAccess: EthereumHeaderBarModel['promptForAccountAccess'] }) =>
	<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px' }}>
		<Warning/>
		<div style={{ flexShrink: 1, textAlign: 'center', padding: '5px' }}>
			To utilize all of the features of this app, you must grant it read access to your wallet.  <span style={{ cursor: 'pointer', color: '#fb887c', whiteSpace: 'nowrap' }} onClick={promptForAccountAccess}>Prompt for account access.</span>
		</div>
		<Warning/>
	</div>

const AddressDisplay = ({address}: {address: { number: bigint, string: string } }) =>
	<div style={{ textAlign: 'right' }}>
		{`0x${address.string}`}
	</div>
