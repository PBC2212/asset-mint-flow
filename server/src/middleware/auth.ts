export interface User {
  user_id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  wallet_address?: string;
  kyc_status: 'pending' | 'approved' | 'rejected';
  kyc_level: number;
  created_at: string;
  updated_at?: string;
  last_login?: string;
  is_active: boolean;
  preferences?: Record<string, any>;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
  acceptTerms: boolean;
  acceptPrivacyPolicy: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  walletAddress?: string;
  kycStatus: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenData {
  userId: string;
  tokenId: string;
  expiresAt: string;
  isActive: boolean;
}

export interface AuthRequest {
  user?: User;
  token?: string;
}

export interface ConnectWalletRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: Omit<User, 'user_id'>;
    tokens: AuthTokens;
  };
}

export interface AuthError {
  code: string;
  message: string;
  field?: string;
}