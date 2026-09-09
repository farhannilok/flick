import { v2 as cloudinary } from 'cloudinary';
import fs from 'node:fs';

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
	api_key: process.env.CLOUDINARY_API_KEY!,
	api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const uploadOnCloudinary = async (filePath: string) => {
	try {
		// upload file on cloudinary
		const response = await cloudinary.uploader.upload(filePath, {
			resource_type: 'auto',
		});
		// file has been successfully uploaded
		console.log('File has been uploaded successfully: ', response.url);
		return response;
	} catch (err) {
		// remove locally saved temporary file as upload failed
		fs.unlinkSync(filePath);
		console.log('Error Occured', err);
		return null;
	}
};
