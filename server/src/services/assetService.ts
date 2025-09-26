import { supabaseAdmin } from '../config/supabase.ts';
import { stellarService } from './stellarService.ts';
import { logger } from '../utils/logger.ts';
import { AppError } from '../middleware/errorHandler.ts';
import {
  Asset,
  AssetStatus,
  AssetPledgeRequest,
  AssetValuation,
  TokenMintRequest,
  AssetPortfolio,
  AssetAnalytics
} from '../types/asset.ts';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class AssetService {
  /**
   * Create a new asset pledge
   */
  static async createAssetPledge(
    userId: string,
    walletAddress: string,
    pledgeRequest: AssetPledgeRequest
  ): Promise<Asset> {
    try {
      const agreementId = `AGR-${Date.now()}-${uuidv4().substring(0, 8)}`;
      const assetId = `AST-${Date.now()}-${uuidv4().substring(0, 8)}`;
      
      // Calculate discounted value
      const discountedValue = pledgeRequest.originalValue * (1 - pledgeRequest.discountPercentage / 100);
      
      // Calculate tokens to issue (1:1 ratio with discounted value)
      const tokensIssued = discountedValue;

      // Create pledge agreement record
      const { data: asset, error } = await supabaseAdmin
        .from('pledge_agreements')
        .insert({
          agreement_id: agreementId,
          asset_id: assetId,
          asset_type: pledgeRequest.assetType,
          client_address: walletAddress,
          original_value: pledgeRequest.originalValue,
          discounted_value: discountedValue,
          client_payment: pledgeRequest.clientPayment,
          tokens_issued: tokensIssued,
          description: pledgeRequest.description,
          document_hash: pledgeRequest.documentHash,
          status: AssetStatus.PENDING
        })
        .select()
        .single();

      if (error || !asset) {
        logger.error('Failed to create asset pledge:', error);
        throw new AppError('Failed to create asset pledge', 500);
      }

      logger.info(`Asset pledge created: ${assetId} for user ${userId}`);
      return asset as Asset;
    } catch (error: any) {
      logger.error('AssetService.createAssetPledge error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create asset pledge', 500);
    }
  }

  /**
   * Verify asset and update status
   */
  static async verifyAsset(assetId: string, verificationData: {
    status: AssetStatus;
    verifiedValue?: number;
    verificationNotes?: string;
  }): Promise<Asset> {
    try {
      const updates: any = {
        status: verificationData.status,
        updated_at: new Date().toISOString()
      };

      if (verificationData.verifiedValue) {
        updates.original_value = verificationData.verifiedValue;
        // Recalculate discounted value and tokens
        const currentAsset = await this.getAssetById(assetId);
        const discountPercentage = (1 - currentAsset.discounted_value / currentAsset.original_value) * 100;
        updates.discounted_value = verificationData.verifiedValue * (1 - discountPercentage / 100);
        updates.tokens_issued = updates.discounted_value;
      }

      const { data: asset, error } = await supabaseAdmin
        .from('pledge_agreements')
        .update(updates)
        .eq('asset_id', assetId)
        .select()
        .single();

      if (error || !asset) {
        throw new AppError('Failed to verify asset', 500);
      }

      logger.info(`Asset verified: ${assetId}, status: ${verificationData.status}`);
      return asset as Asset;
    } catch (error: any) {
      logger.error('AssetService.verifyAsset error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to verify asset', 500);
    }
  }

  /**
   * Mint PLAT tokens for verified asset
   */
  static async mintTokensForAsset(
    assetId: string,
    mintRequest: TokenMintRequest
  ): Promise<{ asset: Asset; transactionHash: string }> {
    try {
      // Get asset details
      const asset = await this.getAssetById(assetId);
      
      if (asset.status !== AssetStatus.VERIFIED) {
        throw new AppError('Asset must be verified before minting tokens', 400);
      }

      // Mint PLAT tokens on Stellar
      const mintResult = await stellarService.mintPlatTokens(
        mintRequest.recipient,
        mintRequest.amount.toString(),
        mintRequest.memo || `Asset tokenization: ${assetId}`
      );

      // Update asset with transaction details
      const { data: updatedAsset, error } = await supabaseAdmin
        .from('pledge_agreements')
        .update({
          status: AssetStatus.ACTIVE,
          transaction_hash: mintResult.transactionHash,
          updated_at: new Date().toISOString()
        })
        .eq('asset_id', assetId)
        .select()
        .single();

      if (error || !updatedAsset) {
        throw new AppError('Failed to update asset after minting', 500);
      }

      logger.info(`Tokens minted for asset ${assetId}: ${mintRequest.amount} PLAT`);
      
      return {
        asset: updatedAsset as Asset,
        transactionHash: mintResult.transactionHash
      };
    } catch (error: any) {
      logger.error('AssetService.mintTokensForAsset error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to mint tokens', 500);
    }
  }

  /**
   * Get asset by ID
   */
  static async getAssetById(assetId: string): Promise<Asset> {
    try {
      const { data: asset, error } = await supabaseAdmin
        .from('pledge_agreements')
        .select('*')
        .eq('asset_id', assetId)
        .single();

      if (error || !asset) {
        throw new AppError('Asset not found', 404);
      }

      return asset as Asset;
    } catch (error: any) {
      logger.error('AssetService.getAssetById error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get asset', 500);
    }
  }

  /**
   * Get user's asset portfolio
   */
  static async getUserPortfolio(userId: string, walletAddress: string): Promise<AssetPortfolio> {
    try {
      const { data: assets, error } = await supabaseAdmin
        .from('pledge_agreements')
        .select('*')
        .eq('client_address', walletAddress)
        .order('created_at', { ascending: false });

      if (error) {
        throw new AppError('Failed to get user portfolio', 500);
      }

      const assetList = assets as Asset[];
      
      // Calculate portfolio metrics
      const totalAssets = assetList.length;
      const totalValue = assetList.reduce((sum, asset) => sum + asset.original_value, 0);
      const totalTokensIssued = assetList.reduce((sum, asset) => sum + asset.tokens_issued, 0);
      const activeAssets = assetList.filter(asset => asset.status === AssetStatus.ACTIVE).length;
      const pendingAssets = assetList.filter(asset => asset.status === AssetStatus.PENDING).length;

      // Calculate performance (mock data - would be calculated from historical data)
      const performance = {
        totalReturn: 0.0, // Would calculate based on token price changes
        monthlyReturn: 0.0,
        yearlyReturn: 0.0
      };

      return {
        totalAssets,
        totalValue,
        totalTokensIssued,
        activeAssets,
        pendingAssets,
        assets: assetList,
        performance
      };
    } catch (error: any) {
      logger.error('AssetService.getUserPortfolio error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get portfolio', 500);
    }
  }

  /**
   * Get platform asset analytics
   */
  static async getPlatformAnalytics(): Promise<AssetAnalytics> {
    try {
      // Get all assets
      const { data: assets, error } = await supabaseAdmin
        .from('pledge_agreements')
        .select('*');

      if (error) {
        throw new AppError('Failed to get analytics data', 500);
      }

      const assetList = assets as Asset[];

      // Asset type distribution
      const assetTypeDistribution = assetList.reduce((acc, asset) => {
        acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Value distribution (by ranges)
      const valueDistribution = assetList.reduce((acc, asset) => {
        let range = '';
        if (asset.original_value < 10000) range = '<$10K';
        else if (asset.original_value < 50000) range = '$10K-$50K';
        else if (asset.original_value < 100000) range = '$50K-$100K';
        else if (asset.original_value < 500000) range = '$100K-$500K';
        else range = '>$500K';
        
        acc[range] = (acc[range] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Status distribution
      const statusDistribution = assetList.reduce((acc, asset) => {
        acc[asset.status] = (acc[asset.status] || 0) + 1;
        return acc;
      }, {} as Record<AssetStatus, number>);

      // Top assets by value
      const topAssets = assetList
        .sort((a, b) => b.original_value - a.original_value)
        .slice(0, 10);

      // Monthly growth (mock data - would calculate from historical data)
      const monthlyGrowth = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
          month: date.toISOString().substring(0, 7),
          assetsAdded: Math.floor(Math.random() * 10) + 1,
          valueAdded: Math.floor(Math.random() * 100000) + 10000,
          tokensIssued: Math.floor(Math.random() * 50000) + 5000
        };
      }).reverse();

      return {
        assetTypeDistribution,
        valueDistribution,
        statusDistribution,
        monthlyGrowth,
        topAssets
      };
    } catch (error: any) {
      logger.error('AssetService.getPlatformAnalytics error:', error);
      throw new AppError('Failed to get analytics', 500);
    }
  }

  /**
   * Calculate asset valuation
   */
  static async calculateAssetValuation(
    assetType: string,
    originalValue: number,
    metadata?: any
  ): Promise<AssetValuation> {
    try {
      // Mock valuation logic - in production, this would integrate with external APIs
      let currentMarketValue = originalValue;
      let confidenceLevel = 70;
      let valuationMethod: 'comparative' | 'cost' | 'income' | 'expert' = 'comparative';

      // Adjust based on asset type
      switch (assetType.toLowerCase()) {
        case 'real_estate':
          // Real estate typically appreciates
          currentMarketValue = originalValue * (1 + Math.random() * 0.1 - 0.05);
          confidenceLevel = 85;
          valuationMethod = 'comparative';
          break;
        case 'vehicle':
          // Vehicles typically depreciate
          currentMarketValue = originalValue * (0.8 + Math.random() * 0.2);
          confidenceLevel = 90;
          valuationMethod = 'comparative';
          break;
        case 'commodity':
          // Commodities fluctuate
          currentMarketValue = originalValue * (0.9 + Math.random() * 0.2);
          confidenceLevel = 75;
          valuationMethod = 'comparative';
          break;
        case 'art':
          // Art can vary widely
          currentMarketValue = originalValue * (0.7 + Math.random() * 0.6);
          confidenceLevel = 60;
          valuationMethod = 'expert';
          break;
        default:
          valuationMethod = 'cost';
      }

      const discountPercentage = 20; // Platform standard discount
      const discountedValue = currentMarketValue * (1 - discountPercentage / 100);

      return {
        originalValue,
        currentMarketValue: Math.round(currentMarketValue),
        discountedValue: Math.round(discountedValue),
        discountPercentage,
        appraisalDate: new Date().toISOString(),
        valuationMethod,
        confidenceLevel
      };
    } catch (error: any) {
      logger.error('AssetService.calculateAssetValuation error:', error);
      throw new AppError('Failed to calculate asset valuation', 500);
    }
  }

  /**
   * Search assets with filters
   */
  static async searchAssets(filters: {
    assetType?: string;
    status?: AssetStatus;
    minValue?: number;
    maxValue?: number;
    clientAddress?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ assets: Asset[]; total: number }> {
    try {
      let query = supabaseAdmin
        .from('pledge_agreements')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.assetType) {
        query = query.eq('asset_type', filters.assetType);
      }
      if (filters.status !== undefined) {
        query = query.eq('status', filters.status);
      }
      if (filters.minValue) {
        query = query.gte('original_value', filters.minValue);
      }
      if (filters.maxValue) {
        query = query.lte('original_value', filters.maxValue);
      }
      if (filters.clientAddress) {
        query = query.eq('client_address', filters.clientAddress);
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Order by creation date
      query = query.order('created_at', { ascending: false });

      const { data: assets, error, count } = await query;

      if (error) {
        throw new AppError('Failed to search assets', 500);
      }

      return {
        assets: assets as Asset[],
        total: count || 0
      };
    } catch (error: any) {
      logger.error('AssetService.searchAssets error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to search assets', 500);
    }
  }
}