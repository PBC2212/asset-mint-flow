import { Request, Response } from 'express';
import { z } from 'zod';
import { AssetService } from '../services/assetService.ts';
import { stellarService } from '../services/stellarService.ts';
import { AppError, catchAsync } from '../middleware/errorHandler.ts';
import { AssetStatus } from '../types/asset.ts';
import { logger } from '../utils/logger.ts';

// Validation schemas
const createAssetPledgeSchema = z.object({
  assetType: z.enum(['real_estate', 'vehicle', 'commodity', 'art', 'jewelry', 'equipment', 'other']),
  description: z.string().min(10).max(1000),
  originalValue: z.number().min(1000).max(10000000), // $1K to $10M
  discountPercentage: z.number().min(5).max(50).default(20), // 5% to 50%, default 20%
  clientPayment: z.number().min(0),
  documentHash: z.string().optional(),
  metadata: z.object({
    // Real Estate
    address: z.string().optional(),
    propertyType: z.enum(['residential', 'commercial', 'industrial', 'land']).optional(),
    squareFootage: z.number().optional(),
    yearBuilt: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    
    // Commodity
    commodityType: z.enum(['gold', 'silver', 'oil', 'agricultural', 'other']).optional(),
    weight: z.number().optional(),
    purity: z.number().optional(),
    storageLocation: z.string().optional(),
    
    // Vehicle
    make: z.string().optional(),
    model: z.string().optional(),
    year: z.number().optional(),
    mileage: z.number().optional(),
    vin: z.string().optional(),
    
    // Art/Collectibles
    artist: z.string().optional(),
    medium: z.string().optional(),
    dimensions: z.string().optional(),
    provenance: z.string().optional(),
    
    // Generic
    condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
    appraisalDate: z.string().optional(),
    appraisalCompany: z.string().optional(),
    insuranceValue: z.number().optional()
  }).optional()
});

const verifyAssetSchema = z.object({
  status: z.nativeEnum(AssetStatus),
  verifiedValue: z.number().min(0).optional(),
  verificationNotes: z.string().max(500).optional()
});

const mintTokensSchema = z.object({
  amount: z.number().min(1),
  recipient: z.string().min(56).max(56), // Stellar public key length
  memo: z.string().max(28).optional() // Stellar memo limit
});

const searchAssetsSchema = z.object({
  assetType: z.string().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  minValue: z.number().min(0).optional(),
  maxValue: z.number().min(0).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

export class AssetController {
  /**
   * Create a new asset pledge
   */
  static createAssetPledge = catchAsync(async (req: Request, res: Response) => {
    if (!req.user || !req.user.wallet_address) {
      throw new AppError('Wallet connection required', 400);
    }

    if (req.user.kyc_status !== 'approved') {
      throw new AppError('KYC approval required to pledge assets', 403);
    }

    const pledgeData = createAssetPledgeSchema.parse(req.body);

    // Calculate asset valuation
    const valuation = await AssetService.calculateAssetValuation(
      pledgeData.assetType,
      pledgeData.originalValue,
      pledgeData.metadata
    );

    // Create asset pledge
    const asset = await AssetService.createAssetPledge(
      req.user.user_id,
      req.user.wallet_address,
      {
        ...pledgeData,
        discountPercentage: pledgeData.discountPercentage || 20
      }
    );

    logger.info(`Asset pledge created by user ${req.user.email}: ${asset.asset_id}`);

    res.status(201).json({
      success: true,
      message: 'Asset pledge created successfully',
      data: {
        asset: {
          id: asset.asset_id,
          agreementId: asset.agreement_id,
          assetType: asset.asset_type,
          description: asset.description,
          originalValue: asset.original_value,
          discountedValue: asset.discounted_value,
          clientPayment: asset.client_payment,
          tokensIssued: asset.tokens_issued,
          status: asset.status,
          createdAt: asset.created_at
        },
        valuation
      }
    });
  });

  /**
   * Get user's asset portfolio
   */
  static getUserPortfolio = catchAsync(async (req: Request, res: Response) => {
    if (!req.user || !req.user.wallet_address) {
      throw new AppError('Wallet connection required', 400);
    }

    const portfolio = await AssetService.getUserPortfolio(
      req.user.user_id,
      req.user.wallet_address
    );

    // Get current PLAT balance from Stellar
    let platBalance = '0';
    try {
      platBalance = await stellarService.getPlatBalance(req.user.wallet_address);
    } catch (error) {
      logger.warn(`Failed to get PLAT balance for ${req.user.wallet_address}:`, error);
    }

    res.status(200).json({
      success: true,
      data: {
        ...portfolio,
        currentPlatBalance: platBalance,
        summary: {
          totalAssets: portfolio.totalAssets,
          totalValue: portfolio.totalValue,
          totalTokensIssued: portfolio.totalTokensIssued,
          activeAssets: portfolio.activeAssets,
          pendingAssets: portfolio.pendingAssets,
          currentPlatBalance: platBalance
        }
      }
    });
  });

  /**
   * Get specific asset details
   */
  static getAssetDetails = catchAsync(async (req: Request, res: Response) => {
    const { assetId } = req.params;

    if (!assetId) {
      throw new AppError('Asset ID is required', 400);
    }

    const asset = await AssetService.getAssetById(assetId);

    // Check if user owns this asset or is admin
    if (req.user && asset.client_address !== req.user.wallet_address) {
      // For now, allow public access to asset details for transparency
      // In production, you might want to restrict this
    }

    // Get transaction details if available
    let transactionDetails = null;
    if (asset.transaction_hash) {
      try {
        // This would fetch transaction details from Stellar
        transactionDetails = {
          hash: asset.transaction_hash,
          status: 'confirmed',
          // Add more transaction details as needed
        };
      } catch (error) {
        logger.warn(`Failed to get transaction details for ${asset.transaction_hash}:`, error);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        asset: {
          id: asset.asset_id,
          agreementId: asset.agreement_id,
          assetType: asset.asset_type,
          description: asset.description,
          originalValue: asset.original_value,
          discountedValue: asset.discounted_value,
          clientPayment: asset.client_payment,
          tokensIssued: asset.tokens_issued,
          status: asset.status,
          documentHash: asset.document_hash,
          clientAddress: asset.client_address,
          createdAt: asset.created_at,
          updatedAt: asset.updated_at
        },
        transaction: transactionDetails
      }
    });
  });

  /**
   * Verify asset (admin only)
   */
  static verifyAsset = catchAsync(async (req: Request, res: Response) => {
    // TODO: Add admin role check
    // For now, require KYC approval as minimum
    if (!req.user || req.user.kyc_status !== 'approved') {
      throw new AppError('Admin privileges required', 403);
    }

    const { assetId } = req.params;
    const verificationData = verifyAssetSchema.parse(req.body);

    const asset = await AssetService.verifyAsset(assetId, verificationData);

    logger.info(`Asset verified by ${req.user.email}: ${assetId}, status: ${verificationData.status}`);

    res.status(200).json({
      success: true,
      message: 'Asset verification updated successfully',
      data: {
        asset: {
          id: asset.asset_id,
          status: asset.status,
          originalValue: asset.original_value,
          discountedValue: asset.discounted_value,
          tokensIssued: asset.tokens_issued,
          updatedAt: asset.updated_at
        }
      }
    });
  });

  /**
   * Mint tokens for verified asset
   */
  static mintTokensForAsset = catchAsync(async (req: Request, res: Response) => {
    if (!req.user || req.user.kyc_status !== 'approved') {
      throw new AppError('Admin privileges required', 403);
    }

    const { assetId } = req.params;
    const mintData = mintTokensSchema.parse(req.body);

    const result = await AssetService.mintTokensForAsset(assetId, {
      assetId,
      amount: mintData.amount,
      recipient: mintData.recipient,
      memo: mintData.memo
    });

    logger.info(`Tokens minted for asset ${assetId}: ${mintData.amount} PLAT to ${mintData.recipient}`);

    res.status(200).json({
      success: true,
      message: 'Tokens minted successfully',
      data: {
        asset: result.asset,
        transaction: {
          hash: result.transactionHash,
          amount: mintData.amount,
          recipient: mintData.recipient,
          memo: mintData.memo
        }
      }
    });
  });

  /**
   * Search assets with filters
   */
  static searchAssets = catchAsync(async (req: Request, res: Response) => {
    const filters = searchAssetsSchema.parse(req.query);

    // If user is authenticated, they can see their own assets
    // Otherwise, only show public/active assets
    if (req.user && req.user.wallet_address) {
      filters.clientAddress = req.user.wallet_address;
    } else {
      // Public search - only show active assets
      filters.status = AssetStatus.ACTIVE;
    }

    const result = await AssetService.searchAssets(filters);

    res.status(200).json({
      success: true,
      data: {
        assets: result.assets.map(asset => ({
          id: asset.asset_id,
          assetType: asset.asset_type,
          description: asset.description,
          originalValue: asset.original_value,
          discountedValue: asset.discounted_value,
          tokensIssued: asset.tokens_issued,
          status: asset.status,
          createdAt: asset.created_at
        })),
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: (filters.offset || 0) + (filters.limit || 20) < result.total
        }
      }
    });
  });

  /**
   * Get platform analytics
   */
  static getPlatformAnalytics = catchAsync(async (req: Request, res: Response) => {
    const analytics = await AssetService.getPlatformAnalytics();

    res.status(200).json({
      success: true,
      data: analytics
    });
  });

  /**
   * Get asset valuation estimate
   */
  static getAssetValuation = catchAsync(async (req: Request, res: Response) => {
    const valuationSchema = z.object({
      assetType: z.string(),
      originalValue: z.number().min(1),
      metadata: z.object({}).optional()
    });

    const { assetType, originalValue, metadata } = valuationSchema.parse(req.body);

    const valuation = await AssetService.calculateAssetValuation(
      assetType,
      originalValue,
      metadata
    );

    res.status(200).json({
      success: true,
      data: valuation
    });
  });

  /**
   * Establish trustline for PLAT token
   */
  static establishTrustline = catchAsync(async (req: Request, res: Response) => {
    if (!req.user || !req.user.wallet_address) {
      throw new AppError('Wallet connection required', 400);
    }

    const trustlineSchema = z.object({
      walletSecretKey: z.string(), // In production, this should be handled by wallet signing
      limit: z.string().optional()
    });

    const { walletSecretKey, limit } = trustlineSchema.parse(req.body);

    // TODO: In production, use wallet signing instead of requiring secret key
    // This is a simplified implementation for development
    const { Keypair } = await import('@stellar/stellar-sdk');
    const userKeypair = Keypair.fromSecret(walletSecretKey);

    if (userKeypair.publicKey() !== req.user.wallet_address) {
      throw new AppError('Wallet key mismatch', 400);
    }

    const result = await stellarService.establishTrustline(userKeypair, limit);

    logger.info(`Trustline established for user ${req.user.email}: ${req.user.wallet_address}`);

    res.status(200).json({
      success: true,
      message: 'Trustline established successfully',
      data: result
    });
  });

  /**
   * Get asset types and metadata schema
   */
  static getAssetTypes = catchAsync(async (req: Request, res: Response) => {
    const assetTypes = {
      real_estate: {
        label: 'Real Estate',
        fields: [
          { name: 'address', label: 'Property Address', type: 'text', required: true },
          { name: 'propertyType', label: 'Property Type', type: 'select', options: ['residential', 'commercial', 'industrial', 'land'] },
          { name: 'squareFootage', label: 'Square Footage', type: 'number' },
          { name: 'yearBuilt', label: 'Year Built', type: 'number' },
          { name: 'bedrooms', label: 'Bedrooms', type: 'number' },
          { name: 'bathrooms', label: 'Bathrooms', type: 'number' }
        ]
      },
      vehicle: {
        label: 'Vehicle',
        fields: [
          { name: 'make', label: 'Make', type: 'text', required: true },
          { name: 'model', label: 'Model', type: 'text', required: true },
          { name: 'year', label: 'Year', type: 'number', required: true },
          { name: 'mileage', label: 'Mileage', type: 'number' },
          { name: 'vin', label: 'VIN', type: 'text' }
        ]
      },
      commodity: {
        label: 'Commodity',
        fields: [
          { name: 'commodityType', label: 'Commodity Type', type: 'select', options: ['gold', 'silver', 'oil', 'agricultural', 'other'] },
          { name: 'weight', label: 'Weight', type: 'number' },
          { name: 'purity', label: 'Purity (%)', type: 'number' },
          { name: 'storageLocation', label: 'Storage Location', type: 'text' }
        ]
      },
      art: {
        label: 'Art & Collectibles',
        fields: [
          { name: 'artist', label: 'Artist', type: 'text' },
          { name: 'medium', label: 'Medium', type: 'text' },
          { name: 'dimensions', label: 'Dimensions', type: 'text' },
          { name: 'provenance', label: 'Provenance', type: 'text' }
        ]
      },
      jewelry: {
        label: 'Jewelry',
        fields: [
          { name: 'material', label: 'Material', type: 'text' },
          { name: 'weight', label: 'Weight (grams)', type: 'number' },
          { name: 'purity', label: 'Purity', type: 'text' }
        ]
      },
      equipment: {
        label: 'Equipment',
        fields: [
          { name: 'equipmentType', label: 'Equipment Type', type: 'text' },
          { name: 'manufacturer', label: 'Manufacturer', type: 'text' },
          { name: 'model', label: 'Model', type: 'text' },
          { name: 'serialNumber', label: 'Serial Number', type: 'text' }
        ]
      },
      other: {
        label: 'Other',
        fields: [
          { name: 'category', label: 'Category', type: 'text' },
          { name: 'description', label: 'Description', type: 'textarea' }
        ]
      }
    };

    res.status(200).json({
      success: true,
      data: assetTypes
    });
  });
}