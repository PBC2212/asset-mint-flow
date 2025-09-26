import { Keypair, Account, TransactionBuilder, Operation, Asset, Memo } from '@stellar/stellar-sdk';
import { stellarServer, STELLAR_CONFIG, createPlatTokenAsset } from '../config/stellar.ts';
import { stellarService } from './stellarService.ts';
import { supabaseAdmin } from '../config/supabase.ts';
import { logger } from '../utils/logger.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { WalletBalance, WalletTransaction } from '../types/swap.ts';

export class WalletService {
  /**
   * Get wallet balance for user
   */
  static async getWalletBalance(publicKey: string): Promise<WalletBalance> {
    try {
      const accountInfo = await stellarService.getAccountInfo(publicKey);
      
      // Get XLM balance
      const xlmBalance = accountInfo.balance.find(b => b.asset_type === 'native')?.balance || '0';
      
      // Get PLAT balance
      const platAsset = createPlatTokenAsset();
      const platBalance = accountInfo.balance.find(
        b => b.asset_code === platAsset.code && b.asset_issuer === platAsset.issuer
      )?.balance || '0';

      // Calculate USD values (mock rates - in production, fetch from price API)
      const xlmUsdRate = 0.12; // $0.12 per XLM
      const platUsdRate = 1.0;  // $1.00 per PLAT (backed 1:1 with assets)

      const xlmUsd = parseFloat(xlmBalance) * xlmUsdRate;
      const platUsd = parseFloat(platBalance) * platUsdRate;

      return {
        xlm: xlmBalance,
        plat: platBalance,
        usd: {
          xlm: xlmUsd,
          plat: platUsd,
          total: xlmUsd + platUsd
        }
      };
    } catch (error: any) {
      logger.error('WalletService.getWalletBalance error:', error);
      throw new AppError('Failed to get wallet balance', 500);
    }
  }

  /**
   * Get wallet transaction history
   */
  static async getTransactionHistory(
    publicKey: string,
    limit: number = 50,
    cursor?: string
  ): Promise<{ transactions: WalletTransaction[]; nextCursor?: string }> {
    try {
      const platAsset = createPlatTokenAsset();
      
      // Get transactions from Stellar
      let transactionsCall = stellarServer
        .transactions()
        .forAccount(publicKey)
        .order('desc')
        .limit(limit);

      if (cursor) {
        transactionsCall = transactionsCall.cursor(cursor);
      }

      const stellarTransactions = await transactionsCall.call();
      
      const transactions: WalletTransaction[] = [];
      
      for (const tx of stellarTransactions.records) {
        try {
          // Get operations for this transaction
          const operations = await stellarServer
            .operations()
            .forTransaction(tx.hash)
            .call();

          for (const op of operations.records) {
            if (op.type === 'payment' || op.type === 'create_account') {
              const payment = op as any;
              
              let type: WalletTransaction['type'] = 'payment';
              let asset = 'XLM';
              let amount = '0';

              if (payment.asset_type === 'native') {
                asset = 'XLM';
                amount = payment.amount;
              } else if (payment.asset_code === platAsset.code) {
                asset = 'PLAT';
                amount = payment.amount;
                
                // Check if this is a minting operation
                if (payment.from === platAsset.issuer) {
                  type = 'mint';
                }
              }

              transactions.push({
                id: `${tx.hash}-${op.id}`,
                type,
                amount,
                asset,
                from: payment.from,
                to: payment.to,
                memo: tx.memo,
                transactionHash: tx.hash,
                timestamp: tx.created_at,
                status: tx.successful ? 'confirmed' : 'failed'
              });
            } else if (op.type === 'change_trust') {
              const trustline = op as any;
              
              if (trustline.asset_code === platAsset.code) {
                transactions.push({
                  id: `${tx.hash}-${op.id}`,
                  type: 'trustline',
                  amount: trustline.limit || 'unlimited',
                  asset: 'PLAT',
                  memo: tx.memo,
                  transactionHash: tx.hash,
                  timestamp: tx.created_at,
                  status: tx.successful ? 'confirmed' : 'failed'
                });
              }
            }
          }
        } catch (opError) {
          logger.warn(`Failed to process transaction ${tx.hash}:`, opError);
        }
      }

      // Sort by timestamp descending
      transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const nextCursor = stellarTransactions.records.length === limit 
        ? stellarTransactions.records[stellarTransactions.records.length - 1].paging_token
        : undefined;

      return {
        transactions: transactions.slice(0, limit),
        nextCursor
      };
    } catch (error: any) {
      logger.error('WalletService.getTransactionHistory error:', error);
      throw new AppError('Failed to get transaction history', 500);
    }
  }

  /**
   * Create new Stellar account with funding
   */
  static async createFundedAccount(startingBalance: string = '10'): Promise<{
    publicKey: string;
    secretKey: string;
    transactionHash: string;
  }> {
    try {
      const newKeypair = await stellarService.createAndFundAccount(startingBalance);
      
      return {
        publicKey: newKeypair.publicKey(),
        secretKey: newKeypair.secret(),
        transactionHash: '' // Would get this from the creation transaction
      };
    } catch (error: any) {
      logger.error('WalletService.createFundedAccount error:', error);
      throw new AppError('Failed to create funded account', 500);
    }
  }

  /**
   * Validate Stellar public key
   */
  static validatePublicKey(publicKey: string): boolean {
    try {
      Keypair.fromPublicKey(publicKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if account exists on Stellar network
   */
  static async checkAccountExists(publicKey: string): Promise<boolean> {
    try {
      await stellarService.getAccountInfo(publicKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if account has PLAT trustline
   */
  static async hasPlatTrustline(publicKey: string): Promise<boolean> {
    try {
      const accountInfo = await stellarService.getAccountInfo(publicKey);
      const platAsset = createPlatTokenAsset();
      
      return accountInfo.balance.some(
        balance => balance.asset_code === platAsset.code && 
                   balance.asset_issuer === platAsset.issuer
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get account signers and thresholds
   */
  static async getAccountSecurity(publicKey: string): Promise<{
    signers: Array<{ key: string; weight: number; type: string }>;
    thresholds: { low: number; medium: number; high: number };
    isMultiSig: boolean;
  }> {
    try {
      const accountInfo = await stellarService.getAccountInfo(publicKey);
      
      const isMultiSig = accountInfo.signers.length > 1 || 
                        accountInfo.thresholds.low_threshold > 1 ||
                        accountInfo.thresholds.med_threshold > 1 ||
                        accountInfo.thresholds.high_threshold > 1;

      return {
        signers: accountInfo.signers,
        thresholds: {
          low: accountInfo.thresholds.low_threshold,
          medium: accountInfo.thresholds.med_threshold,
          high: accountInfo.thresholds.high_threshold
        },
        isMultiSig
      };
    } catch (error: any) {
      logger.error('WalletService.getAccountSecurity error:', error);
      throw new AppError('Failed to get account security info', 500);
    }
  }

  /**
   * Log wallet transaction for tracking
   */
  static async logWalletTransaction(
    userAddress: string,
    transactionType: string,
    transactionHash: string,
    amount?: number,
    asset?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('transaction_log')
        .insert({
          transaction_hash: transactionHash,
          transaction_type: transactionType,
          from_address: userAddress,
          parameters: {
            amount,
            asset,
            ...metadata
          },
          status: 'confirmed'
        });
    } catch (error: any) {
      logger.error('Failed to log wallet transaction:', error);
      // Don't throw error - this is just for logging
    }
  }
}