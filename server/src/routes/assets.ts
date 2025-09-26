import { Router } from 'express';
import { AssetController } from '../controllers/assetController.ts';
import { authenticate, requireKYC, requireWallet, optionalAuth, userRateLimit } from '../middleware/auth.ts';

const router = Router();

// Public routes
router.get('/types', AssetController.getAssetTypes);
router.get('/analytics', AssetController.getPlatformAnalytics);
router.get('/search', optionalAuth, AssetController.searchAssets);
router.get('/:assetId', optionalAuth, AssetController.getAssetDetails);

// Protected routes - require authentication
router.use(authenticate);

// Asset valuation (authenticated users only)
router.post('/valuation', 
  userRateLimit(20, 15 * 60 * 1000), // 20 valuations per 15 minutes
  AssetController.getAssetValuation
);

// Wallet and KYC required routes
router.use(requireWallet);
router.use(requireKYC);

// User portfolio and asset management
router.get('/portfolio/me', AssetController.getUserPortfolio);

router.post('/',
  userRateLimit(5, 60 * 60 * 1000), // 5 asset pledges per hour
  AssetController.createAssetPledge
);

router.post('/trustline',
  userRateLimit(3, 60 * 60 * 1000), // 3 trustline attempts per hour
  AssetController.establishTrustline
);

// Admin routes (require additional privileges)
// TODO: Add proper admin role middleware
router.put('/:assetId/verify', AssetController.verifyAsset);
router.post('/:assetId/mint', AssetController.mintTokensForAsset);

export default router;