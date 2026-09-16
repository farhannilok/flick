import { Router } from 'express';
import {
	changeUserCurrentPassword,
	getCurrentUser,
	getUserChannelProfile,
	loginUser,
	logoutUser,
	registerUser,
	rotateAccessToken,
	updateAccountDetails,
	updateUserAvatar,
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

router.route('/current-user').get(verifyJWT, getCurrentUser);
router.route('/login').post(loginUser);
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/refresh').post(rotateAccessToken);
router.route('/change-password').patch(verifyJWT, changeUserCurrentPassword);
router.route('/update-account').patch(verifyJWT, updateAccountDetails);
router
	.route('/avatar')
	.patch(verifyJWT, upload.single('avatar'), updateUserAvatar);
router
	.route('/cover-image')
	.patch(verifyJWT, upload.single('coverImage'), updateUserAvatar);

router.route('/c/:username').get(verifyJWT, getUserChannelProfile);

export default router;
