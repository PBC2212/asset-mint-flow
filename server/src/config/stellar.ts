import { 
  Server, 
  Keypair, 
  Networks, 
  Account,
  TransactionBuilder,
  Operation,
  Asset,
  Memo
} from '@stellar/stellar-sdk';
import { logger } from '../utils/logger.js';

// Network configuration
export const STELLAR_CONFIG = {
  NETWORK: process.env.STELLAR_NETWORK || 'testnet',
  HORIZON_URL: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  NETWORK_PASSPHRASE: process.env.STELLAR_NETWORK === 'mainnet' 
    ? Networks.PUBLIC 
    : Networks.TESTNET,
  
  // Platform token configuration
  PLAT_TOKEN_CODE: process.env.PLAT_TOKEN_CODE || 'PLAT',
  
  // Account roles
  ISSUER_SECRET: process.env.STELLAR_ISSUER_SECRET_KEY,
  DISTRIBUTOR_SECRET: process.env.STELLAR_DISTRIBUTOR_SECRET_KEY,
  
  // Transaction settings
  BASE_FEE: '100000', // 0.01 XLM
  TIMEOUT: 180, // 3 minutes
};

// Initialize Stellar Server
export const stellarServer = new Server(STELLAR_CONFIG.HORIZON_URL);

// Validate configuration
export const validateStellarConfig = (): boolean => {
  const requiredFields = [
    'STELLAR_ISSUER_SECRET_KEY',
    'STELLAR_DISTRIBUTOR_SECRET_KEY'
  ];
  
  const missing = requiredFields.filter(field => !process.env[field]);
  
  if (missing.length > 0) {
    logger.error(`Missing required Stellar configuration: ${missing.join(', ')}`);
    return false;
  }
  
  // Validate keypairs
  try {
    if (STELLAR_CONFIG.ISSUER_SECRET) {
      Keypair.fromSecret(STELLAR_CONFIG.ISSUER_SECRET);
    }
    if (STELLAR_CONFIG.DISTRIBUTOR_SECRET) {
      Keypair.fromSecret(STELLAR_CONFIG.DISTRIBUTOR_SECRET);
    }
    logger.info('✅ Stellar configuration validated');
    return true;
  } catch (error) {
    logger.error('❌ Invalid Stellar keypairs:', error);
    return false;
  }
};

// Create platform token asset
export const createPlatTokenAsset = (): Asset => {
  if (!STELLAR_CONFIG.ISSUER_SECRET) {
    throw new Error('Issuer secret key not configured');
  }
  
  const issuerKeypair = Keypair.fromSecret(STELLAR_CONFIG.ISSUER_SECRET);
  return new Asset(STELLAR_CONFIG.PLAT_TOKEN_CODE, issuerKeypair.publicKey());
};

// Get account keypairs
export const getIssuerKeypair = (): Keypair => {
  if (!STELLAR_CONFIG.ISSUER_SECRET) {
    throw new Error('Issuer secret key not configured');
  }
  return Keypair.fromSecret(STELLAR_CONFIG.ISSUER_SECRET);
};

export const getDistributorKeypair = (): Keypair => {
  if (!STELLAR_CONFIG.DISTRIBUTOR_SECRET) {
    throw new Error('Distributor secret key not configured');
  }
  return Keypair.fromSecret(STELLAR_CONFIG.DISTRIBUTOR_SECRET);
};

// Test Stellar connection
export const testStellarConnection = async (): Promise<boolean> => {
  try {
    await stellarServer.ledgers().limit(1).call();
    logger.info('✅ Stellar network connection successful');
    return true;
  } catch (error) {
    logger.error('❌ Stellar network connection failed:', error);
    return false;
  }
};