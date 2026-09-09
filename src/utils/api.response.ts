export class ApiResponse {
	statusCode: number;
	data: object;
	message?: string;
	isSuccess: boolean;

	constructor(statusCode: number, data: object, message = 'Success') {
		this.statusCode = statusCode;
		this.data = data;
		this.message = message;
		this.isSuccess = statusCode < 400;
	}
}
