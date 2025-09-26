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
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  currency?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy?: {
    showProfile: boolean;
    showActivity: boolean;
  };
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

export interface KYCData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  documentType: 'passport' | 'driving_license' | 'national_id';
  documentNumber: string;
  documentImages: {
    front: string;
    back?: string;
    selfie: string;
  };
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