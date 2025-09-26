import { stellarService } from './stellarService.ts';
import { WalletService } from './walletService.ts';
import { supabaseAdmin } from '../config/supabase.ts';
import { logger } from '../utils/logger.ts';
import { AppError } from '../middleware/errorHandler.ts';
import {
  SwapRequest,
  SwapQuote,
  SwapExecution,
  SwapStatus,
  LiquidityPool,
  SwapHistory
} from '../types/swap.ts';
import { v4 as uuidv4 } from 'uuid';
import pkg from '@stellar/stellar-sdk';
const { Keypair } = pkg;

export class SwapService {
  private static readonly PLATFORM_FEE_PERCENTAGE = 0.3; // 0.3%
  private static readonly NETWORK_FEE = 0.00001; // 0.00001 XLM
  private static readonly SLIPPAGE_TOLERANCE = 0.5; // 0.5%
  private static readonly QUOTE_VALIDITY_MINUTES = 5; // 5 minutes

  /**
   * Get current liquidity pool state
   */
  static async getLiquidityPool(): Promise<LiquidityPool> {
    try {
      // In a real implementation, this would fetch from actual liquidity pool
      // For now, we'll simulate based on platform analytics
      const { data: analytics } = await supabaseAdmin
        .from('platform_analytics')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      // Mock liquidity pool data - in production, integrate with Stellar DEX
      const platReserve = analytics?.total_tokens_purchased || 100000;
      const xlmReserve = platReserve * 0.12; // Assume 1 PLAT = 0.12 XLM base rate
      const totalLiquidity = platReserve + (xlmReserve * 8.33); // Convert to PLAT equivalent
      const exchangeRate = xlmReserve / platReserve;

      return {
        platReserve,
        xlmReserve,
        totalLiquidity,
        exchangeRate,
        volume24h: analytics?.total_usdt_invested || 50000,
        fees24h: (analytics?.total_usdt_invested || 50000) * 0.003, // 0.3% fees
        priceChange24h: Math.random() * 10 - 5 // Mock price change
      };
    } catch (error: any) {
      logger.error('SwapService.getLiquidityPool error:', error);
      throw new AppError('Failed to get liquidity pool data', 500);
    }
  }

  /**
   * Calculate swap quote
   */
  static async getSwapQuote(swapRequest: SwapRequest): Promise<SwapQuote> {
    try {
      const { fromToken, toToken, amount, slippageTolerance = this.SLIPPAGE_TOLERANCE } = swapRequest;
      
      if (fromToken === toToken) {
        throw new AppError('Cannot swap same token', 400);
      }

      const pool = await this.getLiquidityPool();
      let exchangeRate = pool.exchangeRate;
      let toAmount: number;
      let priceImpact = 0;

      // Calculate exchange based on direction
      if (fromToken === 'PLAT' && toToken === 'XLM') {
        // PLAT → XLM
        exchangeRate = pool.exchangeRate;
        toAmount = amount * exchangeRate;
        
        // Calculate price impact for large trades
        priceImpact = this.calculatePriceImpact(amount, pool.platReserve);
        toAmount = toAmount * (1 - priceImpact / 100);
      } else if (fromToken === 'XLM' && toToken === 'PLAT') {
        // XLM → PLAT
        exchangeRate = 1 / pool.exchangeRate;
        toAmount = amount * exchangeRate;
        
        // Calculate price impact
        priceImpact = this.calculatePriceImpact(amount, pool.xlmReserve);
        toAmount = toAmount * (1 - priceImpact / 100);
      } else {
        throw new AppError('Invalid token pair', 400);
      }

      // Calculate fees
      const platformFee = toAmount * (this.PLATFORM_FEE_PERCENTAGE / 100);
      const networkFee = this.NETWORK_FEE;
      const totalFee = platformFee + networkFee;

      // Final amount after fees
      const finalAmount = toAmount - platformFee;
      
      // Minimum received considering slippage
      const minimumReceived = finalAmount * (1 - slippageTolerance / 100);

      // Quote validity deadline
      const deadline = Date.now() + (this.QUOTE_VALIDITY_MINUTES * 60 * 1000);

      const quote: SwapQuote = {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: finalAmount,
        exchangeRate,
        priceImpact,
        fees: {
          platformFee,
          networkFee,
          totalFee
        },
        minimumReceived,
        deadline,
        quoteId: uuidv4()
      };

      // Store quote for validation during execution
      await this.storeQuote(quote);

      logger.info(`Swap quote generated: ${amount} ${fromToken} → ${finalAmount} ${toToken}`);
      return quote;
    } catch (error: any) {
      logger.error('SwapService.getSwapQuote error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to generate swap quote', 500);
    }
  }

  /**
   * Execute swap transaction
   */
  static async executeSwap(
    userAddress: string,
    quoteId: string,
    userKeypair: Keypair
  ): Promise<SwapExecution> {
    try {
      // Retrieve and validate quote
      const quote = await this.getStoredQuote(quoteId);
      if (!quote) {
        throw new AppError('Quote not found or expired', 404);
      }

      if (Date.now() > quote.deadline) {
        throw new AppError('Quote has expired', 400);
      }

      // Verify user owns the account
      if (userKeypair.publicKey() !== userAddress) {
        throw new AppError('Account mismatch', 400);
      }

      // Check user balance
      const balance = await WalletService.getWalletBalance(userAddress);
      const userBalance = quote.fromToken === 'PLAT' ? parseFloat(balance.plat) : parseFloat(balance.xlm);
      
      if (userBalance < quote.fromAmount) {
        throw new AppError(`Insufficient ${quote.fromToken} balance`, 400);
      }

      let transactionHash: string;
      let actualReceived = quote.toAmount;

      // Execute the swap based on direction
      if (quote.fromToken === 'PLAT' && quote.toToken === 'XLM') {
        // PLAT → XLM swap
        transactionHash = await stellarService.swapPlatForXLM(
          userKeypair,
          quote.fromAmount.toString(),
          quote.toAmount.toString()
        );
      } else {
        // XLM → PLAT swap (would need implementation in stellarService)
        throw new AppError('XLM to PLAT swaps not yet implemented', 501);
      }

      // Create swap execution record
      const swapExecution: SwapExecution = {
        swapId: uuidv4(),
        fromToken: quote.fromToken,
        toToken: quote.toToken,
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
        actualReceived,
        exchangeRate: quote.exchangeRate,
        fees: quote.fees,
        transactionHash,
        status: SwapStatus.CONFIRMED,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        userAddress
      };

      // Store swap record in database
      await this.storeSwapExecution(swapExecution);

      // Log transaction
      await WalletService.logWalletTransaction(
        userAddress,
        'swap',
        transactionHash,
        quote.fromAmount,
        `${quote.fromToken}->${quote.toToken}`,
        { quote, execution: swapExecution }
      );

      logger.info(`Swap executed: ${swapExecution.swapId} - ${quote.fromAmount} ${quote.fromToken} → ${actualReceived} ${quote.toToken}`);
      
      return swapExecution;
    } catch (error: any) {
      logger.error('SwapService.executeSwap error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to execute swap', 500);
    }
  }

  /**
   * Get user's swap history
   */
  static async getSwapHistory(
    userAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SwapHistory> {
    try {
      // Get swaps from database (would need a swaps table)
      // For now, return mock data
      const swaps: SwapExecution[] = [];
      
      // Calculate summary
      const summary = {
        totalSwaps: swaps.length,
        totalVolume: swaps.reduce((sum, swap) => sum + swap.fromAmount, 0),
        totalFees: swaps.reduce((sum, swap) => sum + swap.fees.totalFee, 0),
        averageSize: swaps.length > 0 ? swaps.reduce((sum, swap) => sum + swap.fromAmount, 0) / swaps.length : 0
      };

      return {
        swaps: swaps.slice(offset, offset + limit),
        pagination: {
          total: swaps.length,
          limit,
          offset,
          hasMore: offset + limit < swaps.length
        },
        summary
      };
    } catch (error: any) {
      logger.error('SwapService.getSwapHistory error:', error);
      throw new AppError('Failed to get swap history', 500);
    }
  }

  /**
   * Calculate price impact for large trades
   */
  private static calculatePriceImpact(tradeAmount: number, reserveAmount: number): number {
    // Simple price impact calculation: impact = (tradeAmount / reserveAmount) * 100
    // In reality, this would use AMM formulas like x*y=k
    const impact = (tradeAmount / reserveAmount) * 100;
    return Math.min(impact, 10); // Cap at 10% impact
  }

  /**
   * Store quote temporarily for validation
   */
  private static async storeQuote(quote: SwapQuote): Promise<void> {
    try {
      // In production, store in Redis or similar fast storage
      // For now, we'll use a simple in-memory store
      // This is just a placeholder - implement proper storage
    } catch (error) {
      logger.warn('Failed to store quote:', error);
    }
  }

  /**
   * Retrieve stored quote
   */
  private static async getStoredQuote(quoteId: string): Promise<SwapQuote | null> {
    try {
      // Retrieve from storage
      // For now, return null (quotes would need proper storage implementation)
      return null;
    } catch (error) {
      logger.warn('Failed to retrieve quote:', error);
      return null;
    }
  }

  /**
   * Store swap execution record
   */
  private static async storeSwapExecution(execution: SwapExecution): Promise<void> {
    try {
      // Store in database - would need a swaps table
      // For now, just log it
      logger.info('Swap execution record:', execution);
    } catch (error) {
      logger.warn('Failed to store swap execution:', error);
    }
  }

  /**
   * Get current exchange rates
   */
  static async getExchangeRates(): Promise<{
    platToXlm: number;
    xlmToPlat: number;
    lastUpdated: string;
  }> {
    try {
      const pool = await this.getLiquidityPool();
      
      return {
        platToXlm: pool.exchangeRate,
        xlmToPlat: 1 / pool.exchangeRate,
        lastUpdated: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('SwapService.getExchangeRates error:', error);
      throw new AppError('Failed to get exchange rates', 500);
    }
  }
}