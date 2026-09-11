import { v2 as cloudinary } from 'cloudinary';
import fs from 'node:fs';

export const uploadOnCloudinary = async (filePath: string) => {
	cloudinary.config({
		cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
		api_key: process.env.CLOUDINARY_API_KEY!,
		api_secret: process.env.CLOUDINARY_API_SECRET!,
	});
	try {
		// upload file on cloudinary
		const response = await cloudinary.uploader.upload(filePath, {
			resource_type: 'auto',
		});
		// file has been successfully uploaded and remove from our server
		fs.unlinkSync(filePath);
		return response;
	} catch (err) {
		// remove locally saved temporary file as upload failed
		fs.unlinkSync(filePath);
		console.log('Error Occured', err);
		return null;
	}
};
