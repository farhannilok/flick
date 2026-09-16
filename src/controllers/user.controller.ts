import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async.handler.ts';
import { ApiException } from '../exceptions/api.exception.ts';
import { User } from '../models/user.model.ts';
import { uploadOnCloudinary } from '../utils/cloudinary.ts';
import { ApiResponse } from '../utils/api.response.ts';
import { COOKIE_OPTION } from '../constants/constants.ts';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken = async (user) => {
	try {
		const accessToken = user.generateAccessToken();
		const refreshToken = user.generateRefreshToken();

		user.refreshToken = refreshToken;
		await user.save({
			validateBeforeSave: false,
		});
		return { accessToken, refreshToken };
	} catch (err) {
		throw new ApiException(500, 'Failed generate token');
	}
};

export const registerUser = asyncHandler(
	// Resgister User step
	// receive paylaod from the request object
	// validate data fields eg. empty or wrong data type
	// check user already exists: username, email
	// upload avatar and coverImage to cloudflare if user provide any
	// store user credentials into DB
	// password hasing will be triggered by mongoose pre commit hook
	// remove password and refreshtoken from the response
	// return response
	async (req: Request, res: Response) => {
		const { username, fullName, email, password } = req.body;
		if (
			[username, fullName, email, password].some(
				(field) => !field || field.trim() === '',
			)
		) {
			throw new ApiException(400, 'Missing input fields');
		}

		const userExist = await User.findOne({
			$or: [{ email }, { username }],
		});

		if (userExist) throw new ApiException(400, 'User already exists');

		// get the avatar and coverImage from the req object file property
		const avatarUrl = req.files?.avatar?.[0]?.path;
		const coverImageUrl = req.files?.coverImage?.[0]?.path;

		const [avatar, coverImage] = await Promise.all([
			uploadOnCloudinary(avatarUrl),
			uploadOnCloudinary(coverImageUrl),
		]);

		const createdUser = await User.create({
			username,
			fullName,
			email,
			password,
			avatar: avatar?.url ?? null,
			coverImage: coverImage?.url ?? null,
		});

		// a second DB call to check user creation is successful with the _id property
		// append by select which by default selects all fields
		// and we are excluding the password and refreshToken with a minus symbol prepending
		// really weired syntax
		const createUserSuccessfull = await User.findById(createdUser?._id).select(
			'-password -refreshToken',
		);

		if (!createUserSuccessfull)
			throw new ApiException(500, 'Failed to register user.');
		res
			.status(201)
			.json(
				new ApiResponse(
					201,
					createUserSuccessfull,
					'User registration successfull',
				),
			);
	},
);

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
	// User login step
	// recive user email, password (optional username)
	// validate user data if ok then check with the database record
	// user found create access and refresh token and send them as response
	// user not found then throw error
	const { username, email, password } = req.body;

	if (!username && !email) {
		throw new ApiException(400, 'username or email is required');
	}

	const user = await User.findOne({
		$or: [{ email }, { username }],
	});
	if (!user) throw new ApiException(400, 'User not found');

	const passwordValid = await user.isPasswordCorrect(password);
	if (!passwordValid) throw new ApiException(400, 'Invalid password');

	const { accessToken, refreshToken } =
		await generateAccessAndRefreshToken(user);

	const loggedInUser = await User.findById(user._id).select(
		'-password -refreshToken',
	);

	return res
		.status(200)
		.cookie('accessToken', accessToken, COOKIE_OPTION)
		.cookie('refreshToken', refreshToken, COOKIE_OPTION)
		.json(
			new ApiResponse(200, {
				username: loggedInUser?.username,
				fullName: loggedInUser?.fullName,
				email: loggedInUser?.email,
				accessToken,
				refreshToken,
			}),
		);
});

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
	await User.findByIdAndUpdate(
		req.user._id,
		{
			$unset: {
				refreshToken: 1,
			},
		},
		{
			returnDocument: 'after',
		},
	);

	return res
		.status(200)
		.clearCookie('accessToken', COOKIE_OPTION)
		.clearCookie('refreshToken', COOKIE_OPTION)
		.json(new ApiResponse(200, null, 'User logged out successfully'));
});

export const rotateAccessToken = asyncHandler(
	async (req: Request, res: Response) => {
		// get refreshToken from cookie or header
		// no token found throw error
		// decode token find the user in DB not found throw error
		// match the refreshToken of user and DB not match error
		// genrate new accessToken and refreshToken
		// send in response as well as in cookie;
		const incomingRefreshToken =
			req.cookies?.refreshToken ||
			req.body?.refreshToken ||
			req.header('Authorization')?.replace('Bearer ', '');

		if (!incomingRefreshToken)
			throw new ApiException(401, 'Refresh token is required');

		try {
			const decoded = jwt.verify(
				incomingRefreshToken,
				process.env.REFRESH_TOKEN_SECRET!,
			);

			const user = await User.findById(decoded._id);
			if (!user) throw new ApiException(401, 'Invalid refresh token');
			if (incomingRefreshToken !== user.refreshToken)
				throw new ApiException(401, 'Refresh token expired or tempered');

			const { accessToken, refreshToken } =
				await generateAccessAndRefreshToken(user);
			return res
				.status(200)
				.cookie('accessToken', accessToken, COOKIE_OPTION)
				.cookie('refreshToken', refreshToken, COOKIE_OPTION)
				.json(
					new ApiResponse(
						200,
						{ accessToken, refreshToken },
						'Access token rotated successfully',
					),
				);
		} catch (err) {
			throw new ApiException(401, err?.message ?? 'Internal server error');
		}
	},
);

export const changeUserCurrentPassword = asyncHandler(
	async (req: Request, res: Response) => {
		const { oldPassword, newPassword } = req.body;

		if (!oldPassword && !newPassword)
			throw new ApiException(400, 'Old and new password required');

		const user = await User.findById(req?.user?._id);
		if (!user) throw new ApiException(400, 'Failed identify user');

		const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
		if (!isPasswordCorrect) throw new ApiException(400, 'Invalid old password');

		user.password = newPassword;
		await user.save({ validateBeforeSave: false });
		return res
			.status(200)
			.json(new ApiResponse(200, {}, 'Password changed successfully'));
	},
);

export const getCurrentUser = asyncHandler(
	async (req: Request, res: Response) => {
		return res
			.status(200)
			.json(new ApiResponse(200, req?.user, 'User fetched successfully'));
	},
);

export const updateAccountDetails = asyncHandler(
	async (req: Request, res: Response) => {
		const { fullName, email } = req.body;
		if (!fullName && !email)
			throw new ApiException(400, 'Full name or email required');

		const user = await User.findByIdAndUpdate(
			req?.user?._id,
			{
				$set: {
					...(fullName ? { fullName } : {}),
					...(email ? { email } : {}),
				},
			},
			{
				returnDocument: 'after',
			},
		).select('-password -refreshToken');

		return res
			.status(200)
			.json(
				new ApiResponse(200, user, 'User account details updated successfully'),
			);
	},
);

export const updateUserAvatar = asyncHandler(
	async (req: Request, res: Response) => {
		const avatarPath = req?.file?.path;
		if (!avatarPath) throw new ApiException(400, 'Avatar path is required');

		const avatar = await uploadOnCloudinary(avatarPath);

		if (!avatar?.url) throw new ApiException(500, 'Failed to upload avatar');

		const user = await User.findByIdAndUpdate(
			req?.user?._id,
			{
				$set: {
					avatar: avatar?.url,
				},
			},
			{
				returnDocument: 'after',
			},
		).select('-password -refreshToken');

		return res
			.status(200)
			.json(
				new ApiResponse(
					200,
					{ avatar: user?.avatar },
					'Avatar updated successfully',
				),
			);
	},
);

export const updateUserCoverImage = asyncHandler(
	async (req: Request, res: Response) => {
		const coverImagePath = req?.file?.path;
		if (!coverImagePath) throw new ApiException(400, 'Avatar path is required');

		const coverImage = await uploadOnCloudinary(coverImagePath);

		if (!coverImage?.url)
			throw new ApiException(500, 'Failed to upload avatar');

		const user = await User.findByIdAndUpdate(
			req?.user?._id,
			{
				$set: {
					coverImage: coverImage?.url,
				},
			},
			{
				returnDocument: 'after',
			},
		).select('-password -refreshToken');

		return res
			.status(200)
			.json(
				new ApiResponse(
					200,
					{ coverImage: user?.coverImage },
					'Cover image updated successfully',
				),
			);
	},
);

export const getUserChannelProfile = asyncHandler(
	async (req: Request, res: Response) => {
		const { username } = req.body;
		if (!username) throw new ApiException(400, 'username is required');

		const channel = await User.aggregate([
			{
				$match: {
					username: username?.toLowerCase(),
				},
			},
			{
				$lookup: {
					from: 'subscriptions',
					localField: '_id',
					foreignField: 'channel',
					as: 'subscriber',
				},
			},
			{
				$lookup: {
					from: 'subscriptions',
					localField: '_id',
					foreignField: 'subscriber',
					as: 'subscribedTo',
				},
			},
			{
				$addFields: {
					subscriberCount: {
						$size: '$subscriber',
					},
					channelsSubscribedToCount: {
						$size: '$subscribedTo',
					},

					isSubscribed: {
						$cond: {
							if: { $in: [req?.user?._id, '$subscribers.subscriber'] },
							then: true,
							else: false,
						},
					},
				},
			},
			{
				$project: {
					username: 1,
					email: 1,
					fullName: 1,
					subscriberCount: 1,
					channelsSubscribedToCount: 1,
					isSubscribed: 1,
					avatar: 1,
					coverImage: 1,
				},
			},
		]);

		if (!channel.length) {
			throw new ApiException(400, 'Channel does not exists');
		}

		return res
			.status(200)
			.json(
				new ApiResponse(200, channel[0], 'User channel fetched successfully'),
			);
	},
);
