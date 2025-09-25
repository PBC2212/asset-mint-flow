import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate, optionalAuth, userRateLimit } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', 
  userRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  AuthController.register
);

router.post('/login',
  userRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  AuthController.login
);

router.post('/refresh',
  userRateLimit(10, 15 * 60 * 1000), // 10 refresh attempts per 15 minutes
  AuthController.refreshToken
);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.get('/profile', AuthController.getProfile);
router.put('/profile', AuthController.updateProfile);
router.post('/connect-wallet', AuthController.connectWallet);
router.post('/logout', AuthController.logout);

export default router;