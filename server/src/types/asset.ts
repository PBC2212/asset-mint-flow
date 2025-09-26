export interface Asset {
  id: string;
  agreement_id: string;
  asset_id: string;
  asset_type: string;
  client_address: string;
  original_value: number;
  discounted_value: number;
  client_payment: number;
  tokens_issued: number;
  description: string | null;
  document_hash: string | null;
  status: AssetStatus;
  transaction_hash: string | null;
  block_number: number | null;
  created_at: string;
  updated_at: string | null;
}

export const AssetStatus = {
  PENDING: 0,
  VERIFIED: 1,
  ACTIVE: 2,
  REDEEMED: 3,
  LIQUIDATED: 4,
  REJECTED: 5
} as const;

export type AssetStatus = typeof AssetStatus[keyof typeof AssetStatus];

export interface AssetPledgeRequest {
  assetType: string;
  description: string;
  originalValue: number;
  discountPercentage: number;
  clientPayment: number;
  documentHash?: string;
  metadata?: AssetMetadata;
}

export interface AssetMetadata {
  // Real Estate specific
  address?: string;
  propertyType?: 'residential' | 'commercial' | 'industrial' | 'land';
  squareFootage?: number;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  
  // Commodity specific
  commodityType?: 'gold' | 'silver' | 'oil' | 'agricultural' | 'other';
  weight?: number;
  purity?: number;
  storageLocation?: string;
  
  // Vehicle specific
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  vin?: string;
  
  // Art/Collectibles specific
  artist?: string;
  medium?: string;
  dimensions?: string;
  provenance?: string;
  
  // Generic fields
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  appraisalDate?: string;
  appraisalCompany?: string;
  insuranceValue?: number;
  [key: string]: any;
}

export interface AssetValuation {
  originalValue: number;
  currentMarketValue: number;
  discountedValue: number;
  discountPercentage: number;
  appraisalDate: string;
  valuationMethod: 'comparative' | 'cost' | 'income' | 'expert';
  confidenceLevel: number; // 0-100
}

export interface TokenMintRequest {
  assetId: string;
  amount: number;
  recipient: string;
  memo?: string;
}

export interface AssetRedemption {
  assetId: string;
  tokenAmount: number;
  redemptionType: 'partial' | 'full';
  requestedDate: string;
  expectedCompletionDate?: string;
}

export interface AssetPortfolio {
  totalAssets: number;
  totalValue: number;
  totalTokensIssued: number;
  activeAssets: number;
  pendingAssets: number;
  assets: Asset[];
  performance: {
    totalReturn: number;
    monthlyReturn: number;
    yearlyReturn: number;
  };
}

export interface AssetAnalytics {
  assetTypeDistribution: Record<string, number>;
  valueDistribution: Record<string, number>;
  statusDistribution: Record<AssetStatus, number>;
  monthlyGrowth: Array<{
    month: string;
    assetsAdded: number;
    valueAdded: number;
    tokensIssued: number;
  }>;
  topAssets: Asset[];
}