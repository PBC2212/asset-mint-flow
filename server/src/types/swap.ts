export interface SwapRequest {
  fromToken: 'PLAT' | 'XLM';
  toToken: 'PLAT' | 'XLM';
  amount: number;
  slippageTolerance?: number; // percentage (e.g., 0.5 for 0.5%)
  deadline?: number; // timestamp
}

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  priceImpact: number;
  fees: {
    platformFee: number;
    networkFee: number;
    totalFee: number;
  };
  minimumReceived: number;
  deadline: number;
  quoteId: string;
}

export interface SwapExecution {
  swapId: string;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  actualReceived: number;
  exchangeRate: number;
  fees: {
    platformFee: number;
    networkFee: number;
    totalFee: number;
  };
  transactionHash: string;
  status: SwapStatus;
  createdAt: string;
  completedAt?: string;
  userAddress: string;
}

export enum SwapStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export interface LiquidityPool {
  platReserve: number;
  xlmReserve: number;
  totalLiquidity: number;
  exchangeRate: number;
  volume24h: number;
  fees24h: number;
  priceChange24h: number;
}

export interface SwapHistory {
  swaps: SwapExecution[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalSwaps: number;
    totalVolume: number;
    totalFees: number;
    averageSize: number;
  };
}

export interface WalletBalance {
  xlm: string;
  plat: string;
  usd: {
    xlm: number;
    plat: number;
    total: number;
  };
}

export interface WalletTransaction {
  id: string;
  type: 'payment' | 'trustline' | 'swap' | 'mint';
  amount: string;
  asset: string;
  from?: string;
  to?: string;
  memo?: string;
  transactionHash: string;
  timestamp: string;
  status: 'confirmed' | 'pending' | 'failed';
}