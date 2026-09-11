import { Router } from 'express';
import { registerUser } from '../controllers/user.controller.ts';
import { upload } from '../middlewares/multer.middleware.ts';

const router: Router = Router();

router.route('/register').post(upload.single('avatar'), registerUser);

export default router;
