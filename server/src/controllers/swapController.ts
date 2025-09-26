import { Request, Response } from 'express';
import { z } from 'zod';
import { SwapService } from '../services/swapService.ts';
import { WalletService } from '../services/walletService.ts';
import { AppError, catchAsync } from '../middleware/errorHandler.ts';
import { SwapRequest } from '../types/swap.ts';
import { logger } from '../utils/logger.ts';
import pkg from '@stellar/stellar-sdk';
const { Keypair } = pkg;

// Validation schemas
const swapQuoteSchema = z.object({
  fromToken: z.enum(['PLAT', 'XLM']),
  toToken: z.enum(['PLAT', 'XLM']),
  amount: z.number().min(0.01).max(1000000), // $0.01 to $1M
  slippageTolerance: z.number().min(0.1).max(50).optional(), // 0.1% to 50%
  deadline: z.number().optional() // timestamp
});

const executeSwapSchema = z.object({
  quoteId: z.string().uuid(),
  walletSecretKey: z.string() // In production, use wallet signing instead
});

const swapHistorySchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

export class SwapController {
  /**
   * Get swap quote
   */
  static getSwapQuote = catchAsync(async (req: Request, res: Response) => {
    if (!req.user || !req.user.wallet_address) {
      throw new AppError('Wallet connection required', 400);
    }

    const swapRequest = swapQuoteSchema.parse(req.body) as SwapRequest;

    // Validate token pair
    if (swapRequest.fromToken === swapRequest.toToken) {
      throw new AppError('Cannot swap same token', 400);
    }

    // Check user balance
    const balance = await WalletService.getWalletBalance(req.user.wallet_address);
    const userBalance = swapRequest.fromToken === 'PLAT' 
      ? parseFloat(balance.plat) 
      : parseFloat(balance.xlm);

    if (userBalance < swapRequest.amount) {
      throw new AppError(`Insufficient ${swapRequest.fromToken} balance`, 400);
    }

    const quote = await SwapService.getSwapQuote(swapRequest);

    logger.info(`Swap quote requested by ${req.user.email}: ${swapRequest.amount} ${swapRequest.fromToken} → ${swapRequest.toToken}`);

    res.status(200).json({
      success: true,
      data: {
        quote,
        userBalance: {
          [swapRequest.fromToken.toLowerCase()]: userBalance,
          available: userBalance >= swapRequest.amount
        },
        validUntil: new Date(quote.deadline).toISOString()
      }
    });
  });

  /**
   * Execute swap
   */
  static executeSwap = catchAsync(async (req: Request, res: Response) => {
    if (!req.user || !req.user.wallet_address) {
      throw new AppError('Wallet connection required', 400);
    }

    if (req.user.kyc_status !== 'approved') {
      throw new AppError('KYC approval required for swapping', 403);
    }

    const { quoteId, walletSecretKey } = executeSwapSchema.parse(req.body);

    // TODO: In production, use wallet signing instead of requiring secret key
    // This is simplified for development
    const userKeypair = Keypair.fromSecret(walletSecretKey);

    if (userKeypair.publicKey() !== req.user.wallet_address) {
      throw new AppError('Wallet key mismatch', 400);
    }

    const swapExecution = await SwapService.executeSwap(
      req.user.wallet_address,
      quoteId,
      userKeypair
    );

    logger.info(`Swap executed by ${req.user.email}: ${swapExecution.swapId}`);

    res.status(200).json({
      success: true,
      message: 'Swap executed successfully',
      data: {
        swap: swapExecution,
        transaction: {
          hash: swapExecution.transactionHash,
          status: swapExecution.status,
          explorerUrl: `https://stellar.expert/explorer/testnet/tx/${swapExecution.transactionHash}`
        }
      }
    });
  });

  /**
   * Get user's swap history
   */
  static getSwapHistory = catchAsync(async (req: Request, res: Response) => {
    if (!req.user || !req.user.wallet_address) {
      throw new AppError('Wallet connection required', 400);
    }

    const { limit, offset } = swapHistorySchema.parse(req.query);

    const history = await SwapService.getSwapHistory(
      req.user.wallet_address,
      limit,
      offset
    );

    res.status(200).json({
      success: true,
      data: history
    });
  });

  /**
   * Get current exchange rates
   */
  static getExchangeRates = catchAsync(async (req: Request, res: Response) => {
    const rates = await SwapService.getExchangeRates();

    res.status(200).json({
      success: true,
      data: {
        rates,
        disclaimer: 'Rates are indicative and may change. Final rate determined at execution.'
      }
    });
  });

  /**
   * Get liquidity pool information
   */
  static getLiquidityPool = catchAsync(async (req: Request, res: Response) => {
    const pool = await SwapService.getLiquidityPool();

    res.status(200).json({
      success: true,
      data: {
        pool,
        metrics: {
          totalValueLocked: pool.platReserve + (pool.xlmReserve * (1 / pool.exchangeRate)),
          volume24h: pool.volume24h,
          fees24h: pool.fees24h,
          priceChange24h: pool.priceChange24h,
          currentRate: pool.exchangeRate
        }
      }
    });
  });

  /**
   * Simulate swap for preview (no execution)
   */
  static simulateSwap = catchAsync(async (req: Request, res: Response) => {
    const swapRequest = swapQuoteSchema.parse(req.body) as SwapRequest;

    // Get quote without storing it
    const quote = await SwapService.getSwapQuote(swapRequest);

    res.status(200).json({
      success: true,
      data: {
        simulation: {
          fromAmount: quote.fromAmount,
          toAmount: quote.toAmount,
          exchangeRate: quote.exchangeRate,
          priceImpact: quote.priceImpact,
          fees: quote.fees,
          minimumReceived: quote.minimumReceived
        },
        warning: quote.priceImpact > 5 ? 'High price impact detected' : null
      }
    });
  });

  /**
   * Get swap statistics
   */
  static getSwapStatistics = catchAsync(async (req: Request, res: Response) => {
    // Mock statistics - in production, calculate from actual data
    const stats = {
      totalSwaps: 1247,
      totalVolume: 450000,
      averageSwapSize: 361.67,
      largestSwap: 25000,
      mostPopularPair: 'PLAT/XLM',
      dailyStats: Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toISOString().split('T')[0],
          volume: Math.floor(Math.random() * 50000) + 10000,
          swaps: Math.floor(Math.random() * 100) + 20,
          averageSize: Math.floor(Math.random() * 1000) + 200
        };
      }).reverse()
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  });

  /**
   * Check swap eligibility
   */
  static checkSwapEligibility = catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const checks = {
      authenticated: !!req.user,
      kycApproved: req.user.kyc_status === 'approved',
      walletConnected: !!req.user.wallet_address,
      accountExists: false,
      hasTrustline: false,
      hasBalance: false
    };

    if (req.user.wallet_address) {
      try {
        checks.accountExists = await WalletService.checkAccountExists(req.user.wallet_address);
        checks.hasTrustline = await WalletService.hasPlatTrustline(req.user.wallet_address);
        
        if (checks.accountExists) {
          const balance = await WalletService.getWalletBalance(req.user.wallet_address);
          checks.hasBalance = parseFloat(balance.xlm) > 0 || parseFloat(balance.plat) > 0;
        }
      } catch (error) {
        logger.warn('Failed to check wallet status:', error);
      }
    }

    const eligible = Object.values(checks).every(check => check === true);

    res.status(200).json({
      success: true,
      data: {
        eligible,
        checks,
        requirements: {
          authentication: 'Must be logged in',
          kyc: 'Must complete KYC verification',
          wallet: 'Must connect Stellar wallet',
          account: 'Wallet must be funded on Stellar network',
          trustline: 'Must establish PLAT token trustline',
          balance: 'Must have tokens to swap'
        }
      }
    });
  });
}