import type { NextFunction, Request, Response } from 'express';
import { ApiException } from '../exceptions/api.exception.ts';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.ts';

export const verifyJWT = async (
	req: Request,
	_res: Response,
	next: NextFunction,
) => {
	try {
		const token =
			req.cookies.accessToken ||
			req.header('Authorization')?.replace('Bearer ', '');
		if (!token) throw new ApiException(401, 'Unauthorized request');

		const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);

		if (!decoded) throw new ApiException(401, 'Invalid access token');

		const user = await User.findById(decoded._id).select(
			'-password -refreshToken -avatar -coverImage -watchHistory',
		);

		if (!user) throw new ApiException(401, 'Failed to identify user');

		req.user = user;
		next();
	} catch (err) {
		throw new ApiException(401, err?.message || 'Unauthorized request');
	}
};
