import mongoose from 'mongoose';

export async function connectDB() {
	try {
		await mongoose.connect(process.env.MONGODB_URI as string);
		console.log('🛢 MongoDB connected');
	} catch (err) {
		throw err;
	}
}
