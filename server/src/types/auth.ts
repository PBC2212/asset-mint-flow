export interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  wallet_address: string | null;
  kyc_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: User;
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}

export interface WalletConnection {
  publicKey: string;
  userId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}