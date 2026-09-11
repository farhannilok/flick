// Steps
// 1. create user schema
// 2. establish relation with video schema through watchHistory to push video objectId
// 3. encrypt password before saving by triggering pre hook and only if the password field is not modified
// 4. generate jwt access and refresh tokens also compare the passwords values are correct
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
	{
		username: {
			type: String,
			required: true,
			trim: true,
			unique: true,
			lowercase: true,
			index: true,
		},
		email: {
			type: String,
			required: true,
			trim: true,
			unique: true,
			lowercase: true,
		},
		fullName: {
			type: String,
			required: true,
			trim: true,
		},
		avatar: String,
		coverImage: String,
		password: {
			type: String,
			required: [true, 'Password is required'],
		},
		watchHistory: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Video',
			},
		],
		refreshToken: String,
	},
	{ timestamps: true },
);

userSchema.pre('save', async function () {
	if (!this.isModified('password')) return;
	this.password = await bcrypt.hash(this.password, 10);
	return this.password;
});

userSchema.methods.isPasswordCorrect = async function (password: string) {
	return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
	return jwt.sign(
		{
			_id: this._id,
			email: this.email,
			username: this.username,
			fullname: this.fullname,
		},
		process.env.ACCESS_TOKEN_SECRET!,
		{
			expiresIn: process.env.ACCESS_TOKEN_EXPIRY as string,
		},
	);
};

userSchema.methods.generateRefreshToken = function () {
	return jwt.sign(
		{
			_id: this._id,
		},
		process.env.REFRESH_TOKEN_SECRET!,
		{
			expiresIn: process.env.REFRESH_TOKEN_EXPIRY as string,
		},
	);
};

export const User = mongoose.model('User', userSchema);
