export function bigintToDecimalString(value: bigint, power: bigint): string {
	const integerPart = value / 10n**power
	const fractionalPart = value % 10n**power
	if (fractionalPart === 0n) {
		return integerPart.toString(10)
	} else {
		return `${integerPart.toString(10)}.${fractionalPart.toString(10).padStart(Number(power), '0')}`
	}
}

export function attoethString(value: bigint): string {
	return bigintToDecimalString(value, 18n)
}

export function decimalStringToBigint(value: string, power: number): bigint {
	if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error(`Value is not a decimal string.`)
	let [integerPart, fractionalPart] = value.split('.')
	fractionalPart = (fractionalPart || '').padEnd(power, '0')
	return BigInt(`${integerPart}${fractionalPart}`)
}

export function mergeIn(target: object, source: object) {
	for (const key in source) {
		const targetValue = (target as any)[key] as unknown
		const sourceValue = (source as any)[key] as unknown
		if (targetValue === undefined || targetValue === null) {
			;(target as any)[key] = sourceValue
		} else if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
			mergeIn(targetValue, sourceValue)
		} else {
			// drop source[key], don't want to override the target value
		}
	}
	return target
}

export function isPlainObject(maybe: unknown): maybe is object {
	if (typeof maybe !== 'object') return false
	if (maybe === null) return false
	if (Array.isArray(maybe)) return false
	// classes can get complicated so don't try to merge them.  What does it mean to merge two Promises or two Dates?
	if (Object.getPrototypeOf(maybe) !== Object.prototype) return false
	return true
}

export function isMouseOverTarget(mouseEvent: { currentTarget: EventTarget | null, clientX: number, clientY: number }, targetElement?: Element): boolean {
	if (targetElement === undefined) {
		targetElement = mouseEvent.currentTarget as Element
		if (!(targetElement instanceof Element)) return false
	}
	const boundingClientRect = targetElement.getBoundingClientRect()
	if (mouseEvent.clientX <= boundingClientRect.left) return false
	if (mouseEvent.clientX >= boundingClientRect.right) return false
	if (mouseEvent.clientY <= boundingClientRect.top) return false
	if (mouseEvent.clientY >= boundingClientRect.bottom) return false
	return true
}
