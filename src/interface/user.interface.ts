import { Document, Model } from 'mongoose';

export interface UserModelCustomMethod {
	isPasswordCorrect: (password: string) => Promise<boolean>;
	generateAccessToken: () => string;
	generateRefreshToken: () => string;
}

export interface IUser {
	username: string;
	fullName: string;
	email: string;
	password: string;
	avatar: string | null;
	watchHistory: [] | string[];
	refreshToken: string | null;
	coverImage: string | null;
}

export type UserModel = Model<IUser, {}, UserModelCustomMethod>;
