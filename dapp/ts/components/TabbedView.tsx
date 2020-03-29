import * as React from 'react'
import { AsyncProperty } from '../library/react-utilities'
import { AccountModel } from './App'
import { LeverageTab } from './LeverageTab'

type Tab = 'leverage' | 'close' | 'pool'

export interface TabbedViewModel {
	account: AsyncProperty<undefined | AccountModel>
}

export function TabbedView(model: Readonly<TabbedViewModel>) {
	const [selected, select] = React.useState<Tab>('leverage')
	const tabButtonStyle: React.CSSProperties = {
		cursor: 'pointer',
		height: '40px',
		width: '100px',
		minWidth: '100px',
		borderRadius: '6px',
		fontSize: '16px',
		lineHeight: '40px',
		backgroundColor: '#5094E4',
		color: 'white',
		textAlign: 'center',
		margin: '5px',
		userSelect: 'none',
	}
	return <div style={{ margin: '5px', display: 'flex', flexDirection: 'column', justifyContent: 'stretch', alignItems: 'center' }}>
		<div style={{ display:'flex', justifyContent: 'center', alignItems: 'stretch' }}>
			<div style={tabButtonStyle} onClick={() => select('leverage')}>Leverage</div>
			<div style={tabButtonStyle} onClick={() => select('close')}>Close</div>
			<div style={tabButtonStyle} onClick={() => select('pool')}>Pool</div>
		</div>
		{ selected === 'pool' ? <div>Pool Tab</div>
			: selected === 'close' ? <div>Close Tab</div>
			: <LeverageTab account={model.account}/>
		}
	</div>
}
