import * as React from 'react'
import { EthereumHeaderBar } from './EthereumHeaderBar'
import { TabbedView } from './TabbedView'
import { AsyncProperty } from '../library/react-utilities'

export interface AppModel {
	readonly promptForAccountAccess: () => void
	account: AsyncProperty<undefined | AccountModel>
}

export interface AccountModel {
	refresh: () => void
	address: { number: bigint, string: string }
	attoethBalance: AsyncProperty<bigint>
	attodaiBalance: AsyncProperty<bigint>
}

export function App(model: Readonly<AppModel>) {
	return <div style={{
		margin: '5px',
		display: 'flex',
		flexDirection: 'column',
		fontFamily: 'Roboto Slab,serif',
	}}>
		<EthereumHeaderBar promptForAccountAccess={model.promptForAccountAccess} account={model.account} />
		<TabbedView account={model.account}/>
	</div>
}
