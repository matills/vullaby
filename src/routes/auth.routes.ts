import { Router } from 'express';
import { AuthController, registerBusinessSchema, loginSchema, resetPasswordSchema } from '../controllers/auth.controller';
import { validate } from '../middlewares/validation.middleware';

const router = Router();
const authController = new AuthController();

router.post('/register', validate(registerBusinessSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;