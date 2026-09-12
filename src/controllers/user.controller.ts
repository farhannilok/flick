import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async.handler.ts';
import { ApiException } from '../exceptions/api.exception.ts';
import { User } from '../models/user.model.ts';
import { uploadOnCloudinary } from '../utils/cloudinary.ts';
import { ApiResponse } from '../utils/api.response.ts';
import { COOKIE_OPTION } from '../constants/constants.ts';

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

	if (!username || !email) {
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
