// extends the Node Error class
// add status code, message, errors = [], data = null
// add stack trace, success = false
export class ApiException extends Error {
	statusCode: number;
	data = null;
	errors = [];
	stack?: string;
	success = false;
	constructor(
		statusCode: number,
		message = 'Something went wrong',
		errors = [],
		stack = '',
	) {
		super(message);
		this.statusCode = statusCode;
		this.errors = errors;

		if (stack) {
			this.stack = stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}
