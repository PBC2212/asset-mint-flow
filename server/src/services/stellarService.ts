import pkg from '@stellar/stellar-sdk';
const { 
  Keypair,
  Account,
  TransactionBuilder,
  Operation,
  Asset,
  Memo,
  MemoType,
  BASE_FEE,
  Horizon
} = pkg;

import {
  stellarServer,
  STELLAR_CONFIG,
  createPlatTokenAsset,
  getIssuerKeypair,
  getDistributorKeypair
} from '../config/stellar.ts';
import { logger } from '../utils/logger.ts';
import { AppError } from '../middleware/errorHandler.ts';

export interface StellarAccountInfo {
  publicKey: string;
  balance: Array<{
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
    balance: string;
  }>;
  signers: Array<{
    key: string;
    weight: number;
    type: string;
  }>;
  thresholds: {
    low_threshold: number;
    med_threshold: number;
    high_threshold: number;
  };
}

export interface TokenMintResult {
  transactionHash: string;
  amount: string;
  recipient: string;
  memo?: string;
}

export interface TrustlineResult {
  transactionHash: string;
  asset: string;
  account: string;
}

class StellarService {
  private server: Horizon.Server;
  private platAsset: Asset;

  constructor() {
    this.server = stellarServer;
    this.platAsset = createPlatTokenAsset();
  }

  /**
   * Get account information from Stellar network
   */
  async getAccountInfo(publicKey: string): Promise<StellarAccountInfo> {
    try {
      const account = await this.server.loadAccount(publicKey);
      
      return {
        publicKey: account.accountId(),
        balance: account.balances,
        signers: account.signers,
        thresholds: account.thresholds
      };
    } catch (error: any) {
      logger.error(`Failed to get account info for ${publicKey}:`, error);
      throw new AppError('Account not found or invalid', 404);
    }
  }

  /**
   * Create and fund a new Stellar account
   */
  async createAndFundAccount(startingBalance: string = '10'): Promise<Keypair> {
    try {
      const newKeypair = Keypair.random();
      const distributorKeypair = getDistributorKeypair();
      
      // Load distributor account
      const distributorAccount = await this.server.loadAccount(distributorKeypair.publicKey());
      
      // Build create account transaction
      const transaction = new TransactionBuilder(distributorAccount, {
        fee: BASE_FEE,
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE,
      })
        .addOperation(Operation.createAccount({
          destination: newKeypair.publicKey(),
          startingBalance: startingBalance
        }))
        .addMemo(Memo.text('RWA Platform Account Creation'))
        .setTimeout(STELLAR_CONFIG.TIMEOUT)
        .build();

      // Sign and submit transaction
      transaction.sign(distributorKeypair);
      const result = await this.server.submitTransaction(transaction);
      
      logger.info(`Created new account: ${newKeypair.publicKey()}`);
      return newKeypair;
    } catch (error: any) {
      logger.error('Failed to create account:', error);
      throw new AppError('Failed to create Stellar account', 500);
    }
  }

  /**
   * Establish trustline for PLAT token
   */
  async establishTrustline(userKeypair: Keypair, limit?: string): Promise<TrustlineResult> {
    try {
      const userAccount = await this.server.loadAccount(userKeypair.publicKey());
      
      const transaction = new TransactionBuilder(userAccount, {
        fee: BASE_FEE,
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE,
      })
        .addOperation(Operation.changeTrust({
          asset: this.platAsset,
          limit: limit
        }))
        .addMemo(Memo.text('PLAT Trustline'))
        .setTimeout(STELLAR_CONFIG.TIMEOUT)
        .build();

      transaction.sign(userKeypair);
      const result = await this.server.submitTransaction(transaction);
      
      logger.info(`Trustline established for ${userKeypair.publicKey()}`);
      
      return {
        transactionHash: result.hash,
        asset: `${this.platAsset.code}:${this.platAsset.issuer}`,
        account: userKeypair.publicKey()
      };
    } catch (error: any) {
      logger.error('Failed to establish trustline:', error);
      throw new AppError('Failed to establish trustline', 500);
    }
  }

  /**
   * Mint PLAT tokens to a recipient
   */
  async mintPlatTokens(
    recipientPublicKey: string, 
    amount: string, 
    memo?: string
  ): Promise<TokenMintResult> {
    try {
      const issuerKeypair = getIssuerKeypair();
      const issuerAccount = await this.server.loadAccount(issuerKeypair.publicKey());
      
      const transactionBuilder = new TransactionBuilder(issuerAccount, {
        fee: BASE_FEE,
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE,
      })
        .addOperation(Operation.payment({
          destination: recipientPublicKey,
          asset: this.platAsset,
          amount: amount
        }));
      
      // Add memo if provided
      if (memo) {
        transactionBuilder.addMemo(Memo.text(memo));
      }
      
      const transaction = transactionBuilder
        .setTimeout(STELLAR_CONFIG.TIMEOUT)
        .build();

      transaction.sign(issuerKeypair);
      const result = await this.server.submitTransaction(transaction);
      
      logger.info(`Minted ${amount} PLAT tokens to ${recipientPublicKey}`);
      
      return {
        transactionHash: result.hash,
        amount: amount,
        recipient: recipientPublicKey,
        memo: memo
      };
    } catch (error: any) {
      logger.error('Failed to mint PLAT tokens:', error);
      throw new AppError('Failed to mint tokens', 500);
    }
  }

  /**
   * Get PLAT token balance for an account
   */
  async getPlatBalance(publicKey: string): Promise<string> {
    try {
      const accountInfo = await this.getAccountInfo(publicKey);
      const platBalance = accountInfo.balance.find(
        balance => balance.asset_code === this.platAsset.code && 
                   balance.asset_issuer === this.platAsset.issuer
      );
      
      return platBalance ? platBalance.balance : '0';
    } catch (error: any) {
      logger.error(`Failed to get PLAT balance for ${publicKey}:`, error);
      return '0';
    }
  }

  /**
   * Swap PLAT tokens for XLM
   */
  async swapPlatForXLM(
    userKeypair: Keypair,
    platAmount: string,
    xlmAmount: string
  ): Promise<string> {
    try {
      const userAccount = await this.server.loadAccount(userKeypair.publicKey());
      const distributorKeypair = getDistributorKeypair();
      
      const transaction = new TransactionBuilder(userAccount, {
        fee: BASE_FEE,
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE,
      })
        // Send PLAT to distributor
        .addOperation(Operation.payment({
          destination: distributorKeypair.publicKey(),
          asset: this.platAsset,
          amount: platAmount
        }))
        // Receive XLM from distributor (this would be handled by the distributor)
        .addMemo(Memo.text(`PLAT-XLM Swap: ${platAmount} PLAT for ${xlmAmount} XLM`))
        .setTimeout(STELLAR_CONFIG.TIMEOUT)
        .build();

      transaction.sign(userKeypair);
      const result = await this.server.submitTransaction(transaction);
      
      logger.info(`Swap initiated: ${platAmount} PLAT for ${xlmAmount} XLM`);
      return result.hash;
    } catch (error: any) {
      logger.error('Failed to swap PLAT for XLM:', error);
      throw new AppError('Failed to execute swap', 500);
    }
  }

  /**
   * Get asset information
   */
  getPlatAssetInfo() {
    return {
      code: this.platAsset.code,
      issuer: this.platAsset.issuer,
      type: 'credit_alphanum4'
    };
  }
}

export const stellarService = new StellarService();