import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';

const uploadDir = path.resolve(process.cwd(), 'public/uploads');

const storage = multer.diskStorage({
	destination: function (_req, _file, callback) {
		callback(null, uploadDir);
	},
	filename(req, file, callback) {
		crypto.randomBytes(16, function (err, raw) {
			if (err) return callback(err);
			// get file extenstion from node path module
			const fileExtension = path.extname(file.originalname);
			// get the extenstion from mime type append it with (.) dot notation
			// const fileExt = file.mimetype.split('/')[1]
			const fileName =
				file.fieldname + '-' + raw.toString('hex') + fileExtension;
			callback(null, fileName);
			req.fileName = fileName;
		});
	},
});

export const upload = multer({ storage });
