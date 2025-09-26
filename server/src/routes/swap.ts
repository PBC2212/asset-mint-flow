import { Router } from 'express';
import { SwapController } from '../controllers/swapController.js';
import { authenticate, requireKYC, requireWallet, optionalAuth, userRateLimit } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/rates', SwapController.getExchangeRates);
router.get('/pool', SwapController.getLiquidityPool);
router.get('/statistics', SwapController.getSwapStatistics);
router.post('/simulate', SwapController.simulateSwap);

// Protected routes - require authentication
router.use(authenticate);

// Eligibility check
router.get('/eligibility', SwapController.checkSwapEligibility);

// Wallet required routes
router.use(requireWallet);

// Swap operations (require KYC)
router.post('/quote',
  userRateLimit(30, 15 * 60 * 1000), // 30 quotes per 15 minutes
  SwapController.getSwapQuote
);

router.post('/execute',
  requireKYC,
  userRateLimit(10, 60 * 60 * 1000), // 10 swaps per hour
  SwapController.executeSwap
);

router.get('/history', SwapController.getSwapHistory);

export default router;