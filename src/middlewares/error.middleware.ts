import type { NextFunction, Request, Response } from 'express';
import { ApiException } from '../exceptions/api.exception.ts';
import { ApiResponse } from '../utils/api.response.ts';

export function errorHandler(
	err: ApiException,
	_req: Request,
	res: Response,
	next: NextFunction,
) {
	if (res.headersSent) {
		return next(err);
	}
	const statusCode = err.statusCode || 500;
	const message = err.message || 'Something went wrong, please try again later';
	res.status(statusCode).json(new ApiResponse(statusCode, null, message));
}
