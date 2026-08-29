import mongoose from 'mongoose';
import { DB_NAME } from '../constants/constants.ts';


export async function connectDB() {
	try {
		await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('MongoDB connected');
    console.log(DB_NAME)
	} catch (err) {
		throw err
	}
}
