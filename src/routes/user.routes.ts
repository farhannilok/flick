import { Router } from 'express';
import {
	loginUser,
	logoutUser,
	registerUser,
} from '../controllers/user.controller.ts';
import { upload } from '../middlewares/multer.middleware.ts';
import { verifyJWT } from '../middlewares/auth.middleware.ts';

const router: Router = Router();

router.route('/register').post(
	upload.fields([
		{ name: 'avatar', maxCount: 1 },
		{ name: 'coverImage', maxCount: 1 },
	]),
	registerUser,
);

router.route('/login').post(loginUser);
router.route('/logout').get(verifyJWT, logoutUser);

export default router;
