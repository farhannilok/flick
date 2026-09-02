import type { NextFunction, Request, Response } from 'express';

// write asynch handler in a promise
export function asyncHandler(fn: Function) {
	return function (req: Request, res: Response, next: NextFunction) {
		Promise.resolve(fn(req, res, next)).catch((err) => next(err));
	};
}

// function asyncHandler(fn: Function) {
//   return async function(req:Request, res:Response, next: NextFunction) {
//     try {
//       await fn(req, res, next)
//     } catch (err) {
//       next(err)
//     }
//   }
// }
