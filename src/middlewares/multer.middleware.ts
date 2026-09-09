import multer from 'multer';
import crypto from 'node:crypto';

const storage = multer.diskStorage({
	destination: function (_req, _file, callback) {
		callback(null, '../../public/uploads');
	},
	filename(req, file, callback) {
		crypto.randomBytes(16, function (err, raw) {
			if (err) return callback(err);
			callback(null, file.fieldname + '-' + raw.toString('hex'));
		});
	},
});

export const upload = multer({ storage });
