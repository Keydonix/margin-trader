import * as React from 'react'
import { AsyncProperty } from '../library/react-utilities'
import { AccountModel } from './App'
import { decimalStringToBigint, attoethString, isMouseOverTarget } from '../library/utilities'

export interface LeverageTabModel {
	account: AsyncProperty<undefined | AccountModel>
}

export function LeverageTab(_model: LeverageTabModel) {
	const [leverageAmount, ] = React.useState(undefined as bigint | undefined)
	const [leverageMultiplier, ] = React.useState(undefined as bigint | undefined)
	return <>
		<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(min-content, 1fr))', gridGap: '10px' }}>
			<div style={{ gridRowStart: 1, gridRowEnd: 2, gridColumnStart: 1, gridColumnEnd: 3, fontSize: 'xxx-large' }}>Open a Leveraged ETH Position</div>
			<PositionSettings style={{ gridRowStart: 2, gridRowEnd: 3, gridColumnStart: 1, gridColumnEnd: 2, width: 'fit-content', justifySelf: 'flex-end' }}/>
			<PositionPreview leverageAmount={leverageAmount} leverageMultiplier={leverageMultiplier} style={{ gridRowStart: 2, gridRowEnd: 3, gridColumnStart: 2, gridColumnEnd: 3, width: 'fit-content', justifySelf: 'flex-start' }}/>
			<div style={{ gridRowStart: 3, gridRowEnd: 4, gridColumnStart: 1, gridColumnEnd: 3, width: 'fit-content', justifySelf: 'center' }}>Bottom</div>
		</div>
	</>
}

function PositionSettings({ style }: { style?: React.CSSProperties }) {
	const [leverageAmount, setLeverageAmount] = React.useState(undefined as bigint | undefined)
	return <div id='position-settings' style={{ ...style, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
		<LeverageAmount onChange={setLeverageAmount} style={{ marginBottom: '5px' }}/>
		<LeverageMultiplier style={{ marginBottom: '5px' }}/>
		<Slippage leverageAmount={leverageAmount}/>
	</div>
}

function PositionPreview({ style }: { style?: React.CSSProperties, leverageAmount?: bigint, leverageMultiplier?: bigint }) {
	const liquidationPrice = 150n * 10n**18n // prop
	const currentPrice = 200n * 10n**18n // prop
	const doublePrice = 400n * 10n**18n // prop
	const chartHeight = 600
	const [hoverBottom, setHoverBottom] = React.useState(0)
	const hoverPrice = (doublePrice - liquidationPrice) * BigInt(Math.round(hoverBottom)) / 600n + liquidationPrice // onChange prop

	const currentPriceBottom = chartHeight - (chartHeight * (Number(currentPrice / 10n**18n) / Number((doublePrice - liquidationPrice) / 10n**18n)))
	const isDoubleLineHidden = (hoverBottom !== 0 && hoverBottom > 0.9 * chartHeight) || (currentPriceBottom > 0.9 * chartHeight)
	const isCurrentLineHidden = hoverBottom !== 0 && hoverBottom > (currentPriceBottom - 0.05 * chartHeight) && hoverBottom < (currentPriceBottom + 0.05 * chartHeight)
	const isLiquidationLineHidden = (hoverBottom !== 0 && hoverBottom < 0.05 * chartHeight) || (currentPriceBottom < 0.05 * chartHeight)
	const isHoverLineHidden = hoverBottom === 0

	const chartElement: HTMLElement | undefined = undefined
	function onMouse(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
		const eventTarget = event.currentTarget
		if (!(eventTarget instanceof HTMLElement) || !isMouseOverTarget(event, chartElement)) {
			setHoverBottom(0)
			return
		}
		const gradientClientY = eventTarget.getBoundingClientRect().bottom
		const gradientPageY = gradientClientY + window.scrollY
		const mouseRelativeToChartY = gradientPageY - event.pageY
		const chartHeight = eventTarget.getBoundingClientRect().height
		const hoverPercentageOfChart = mouseRelativeToChartY / chartHeight
		setHoverBottom(hoverPercentageOfChart * chartHeight)
	}

return <div id='position-preview' ref={chartElement} onMouseMove={onMouse} onMouseLeave={onMouse} style={{ ...style, height: `${chartHeight}px`, width: '100%', backgroundColor: '#00192b' }}>
		<div id='chart' style={{
			width:'100%',
			height:'100%',
			background:'linear-gradient(180deg, #56BF2B 0%, #6B882E 40%, #A1793E 60%, #FE5F5B 100%)',
			borderRadius: '5px',
			borderBottomColor: 'white',
			borderBottomWidth: 'medium',
			borderBottomStyle: 'solid',
			display: 'block',
			position: 'relative',
			userSelect: 'none',
		}}>
			<div id='double-price-line' style={{
				position: 'absolute',
				top: '0px',
				left: '0px',
				visibility: isDoubleLineHidden ? 'hidden' : 'visible',
			}}>{attoethString(doublePrice)}</div>
			<div id='current-price-line' style={{
				position: 'absolute',
				bottom: currentPriceBottom,
				left: '0px',
				width: '100%',
				justifyContent: 'left',
				borderBottomWidth: '1px',
				borderBottomColor: 'white',
				borderBottomStyle: 'solid',
				visibility: isCurrentLineHidden ? 'hidden' : 'visible',
			}}>{attoethString(currentPrice)}</div>
			<div id='liquidation-price-line' style={{
				position: 'absolute',
				bottom: '0px',
				visibility: isLiquidationLineHidden ? 'hidden' : 'visible',
			}}>{attoethString(liquidationPrice)}</div>
			<div id='hover' style={{
				position: 'absolute',
				left: '0px',
				bottom: hoverBottom,
				width: '100%',
				display: 'flex',
				justifyContent: 'space-between',
				borderBottomWidth: '1px',
				borderBottomColor: 'white',
				borderBottomStyle: 'dotted',
				visibility: isHoverLineHidden ? 'hidden' : 'visible'
			}}>
				<div id='price' style={{
					userSelect: 'none',
					justifyContent: 'left',
				}}>{attoethString(hoverPrice)}</div>
				<div id='value' style={{
					userSelect: 'none',
					justifyContent: 'left',
				}}></div>
			</div>
		</div>
	</div>
}

function LeverageAmount({ style, onChange }: { style?: React.CSSProperties, onChange?: (attoeth: bigint) => void }) {
	const [valueString, setValue] = React.useState('')
	const isDecimalString = /^\d+(?:\.\d+)?$/.test(valueString)
	const isValid = valueString === '' ? true : isDecimalString
	React.useEffect(() => {
		if (onChange === undefined) return
		if (!isDecimalString) return
		const valueBigint = decimalStringToBigint(valueString, 18)
		onChange(valueBigint)
	}, [valueString])

	return <div style={{ ...style, display: 'flex', flexDirection: 'column' }}>
		<div>How much ETH would you like to leverage?</div>
		<div style={{ display: 'flex' }}>
			<input value={valueString} onChange={event => setValue(event.target.value)} type='numeric' placeholder='Between 0.001 and 10' step={0.001} min={0.001} max={10} style={{ flexGrow: 1, borderBottomColor: isValid ? 'white' : 'red', borderBottomStyle: 'solid', borderBottomWidth: '2px' }}/>
			<span style={{ borderStyle: 'none', color: 'yellow', fontSize: 'x-large', fontWeight: 'bold', margin: '5px' }}>ETH</span>
			<i className='help-icon'/>
		</div>
		<div style={{ visibility: isValid ? 'hidden' : 'visible', color: 'red', fontSize: 'small', fontWeight: 100 }}>Between 0.001 and 10</div>
	</div>
}

function LeverageMultiplier({ style }: { style?: React.CSSProperties }) {
	const [value, setValue] = React.useState('')
	const isValid = value !== '' ? /^\d+(?:\.\d+)?$/.test(value) : true

	return <div style={{ ...style, display: 'flex', flexDirection: 'column' }}>
		<div style={{ marginBottom: '1em' }}>How much leverage would you like to have?</div>
		<LeverageMultiplierSlider value={value} onChange={newValue => setValue(newValue.toString(10))} style={{ marginBottom: '0.5em' }}/>
		<LeverageMultiplierChooser onChange={newValue => setValue(newValue.toString(10))} style={{ marginBottom: '0.5em' }}/>
		<LeverageMultiplierEntry value={value} onChange={setValue} isValid={isValid} style={{ }}/>
	</div>
}

function Slippage({ style, leverageAmount }: { style?: React.CSSProperties, leverageAmount?: bigint, onChange?: (value: bigint) => void }) {
	const [valueString, setValueString] = React.useState('')
	const isDecimalString = /^\d+(?:\.\d+)?$/.test(valueString)
	const isValid = valueString === '' || isDecimalString
	const visibility = leverageAmount === undefined ? 'hidden' : 'visible'
	// this whole component will be visibility: 'hidden' if leverage amount is unset, so we can just use `0` as a placeholder
	leverageAmount = leverageAmount || 0n
	const max = leverageAmount / 100n
	const step = max / 100n
	return <div style={{ ...style, display: 'flex', flexDirection: 'column', visibility }}>
		<div style={{ marginBottom: '0.5em' }}>Provide refundable ETH to protect from slippage?</div>
		<div style={{ position: 'relative', display: 'flex', marginBottom: '0.5em' }}>
			<input type='range' min='0' max={attoethString(max)} step={attoethString(step)} style={{ margin:0 }} value={valueString} onChange={event => setValueString(event.target.value)}/>
			<div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', background: 'linear-gradient(to right, #4f95e5 0%, #3cc2b1 100%)', clipPath: 'polygon(100% 0, 0 100%, 100% 100%)', zIndex: -1 }}/>
		</div>
		<div>
			<div style={{ ...style, display: 'flex' }}>
				<input value={valueString} onChange={event => setValueString(event.target.value)} type='numeric' placeholder='Enter an amount or choose above' step={attoethString(step)} min={0} max={attoethString(max)} style={{ flexGrow: 1, borderBottomColor: isValid ? 'white' : 'red', borderBottomStyle: 'solid', borderBottomWidth: '2px' }}/>
				<span style={{ borderStyle: 'none', color: 'yellow', fontSize: 'x-large', fontWeight: 'bold', margin: '5px' }}>ETH</span>
				<i className='help-icon'/>
			</div>
			<div style={{ visibility: isValid ? 'hidden' : 'visible', color: 'red', fontSize: 'small', fontWeight: 100 }}>Between 0.001 and 10</div>
		</div>
	</div>
}

function LeverageMultiplierSlider({ style, value, onChange }: { style?: React.CSSProperties, value: string, onChange: (newValue: number) => void }) {
	return <div style={{ ...style, background: 'linear-gradient(45deg,#3f931d 0,#77852e 25%,#b57342 51%,#fd5e59 100%)', height: '1.5em', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
		<i className='security-icon' style={{ marginLeft: '5px' }}/>
		<input type='range' min='1' max='10' step='0.1' value={value} onChange={event => onChange(event.target.valueAsNumber)} style={{ flexGrow: 1, marginLeft: '5px', marginRight: '5px' }}/>
		<i className='warning-icon' style={{ marginRight: '5px' }}/>
	</div>
}

function LeverageMultiplierChooser({ style, onChange }: { style?: React.CSSProperties, onChange: (newValue: number) => void }) {
	const sectableOptionBaseStyle = { minWidth: 'fit-content', flexGrow: 1, flexShrink: 1, flexBasis: 0, cursor: 'pointer', backgroundColor: 'white', color: '#4f95e5' }

	return <div style={{ ...style, display: 'flex', height: '1.5em', width: '100%', fontSize: 'x-large', textAlign: 'center' }}>
		<div onClick={() => onChange(1.05)} style={{ ...sectableOptionBaseStyle, borderTopLeftRadius: '5px', borderBottomLeftRadius: '5px', marginRight: '2px' }}>1.05</div>
		<div onClick={() => onChange(2.5)} style={{ ...sectableOptionBaseStyle, marginRight: '2px' }}>2.5</div>
		<div onClick={() => onChange(5)} style={{ ...sectableOptionBaseStyle, marginRight: '2px' }}>5</div>
		<div onClick={() => onChange(7.5)} style={{ ...sectableOptionBaseStyle, marginRight: '2px' }}>7.5</div>
		<div onClick={() => onChange(9.95)} style={{ ...sectableOptionBaseStyle, borderTopRightRadius: '5px', borderBottomRightRadius: '5px' }}>9.95</div>
	</div>
}

function LeverageMultiplierEntry({ style, value, isValid, onChange }: { style?: React.CSSProperties, value: string, isValid: boolean, onChange: (newValue: string) => void}) {
	return <>
		<div style={{ ...style, display: 'flex' }}>
			<input value={value} onChange={event => onChange(event.target.value)} type='numeric' placeholder='Enter a multiplier or choose above' step={0.01} min={1} max={10} style={{ flexGrow: 1, borderBottomColor: isValid ? 'white' : 'red', borderBottomStyle: 'solid', borderBottomWidth: '2px' }}/>
			<i className='help-icon'/>
		</div>
		<div style={{ visibility: isValid ? 'hidden' : 'visible', color: 'red', fontSize: 'small', fontWeight: 100 }}>Between 0.001 and 10</div>
	</>
}
