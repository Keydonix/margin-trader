import { mergeIn, isPlainObject } from './utilities'

export function unknownErrorToJsonRpcError(error: unknown, extraData: object) {
	if (error instanceof Error) {
		const mutableError = error as unknown as Record<'code' | 'data', unknown>
		mutableError.code = mutableError.code || -32603
		mutableError.data = mutableError.data || extraData
		if (isPlainObject(mutableError.data)) mergeIn(mutableError.data, extraData)
		return error
	}
	// if someone threw something besides an Error, wrap it up in an error
	return new JsonRpcError(-32603, `Unexpected thrown value.`, mergeIn({ error }, extraData))
}

export class JsonRpcError extends Error {
	constructor(public readonly code: number, message: string, public readonly data?: object) {
		super(message)
		this.name = this.constructor.name
	}
}
