import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { JWTUtil } from '../utils/jwt.js';
import { AppError, catchAsync } from './errorHandler.js';
import { User, AuthRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from header
    const token = JWTUtil.extractTokenFromHeader(req.headers.authorization);
    
    // Verify token
    const decoded = JWTUtil.verifyToken(token);
    
    // Get user from database
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', decoded.userId)
      .single();

    if (error || !user) {
      logger.warn(`Authentication failed for user ID: ${decoded.userId}`);
      throw new AppError('User not found or invalid token', 401);
    }

    // Attach user and token to request
    req.user = user as User;
    req.token = token;
    
    logger.info(`User authenticated: ${user.email}`);
    next();
  } catch (error: any) {
    logger.error('Authentication middleware error:', error);
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError('Authentication failed', 401);
  }
});

/**
 * Middleware to check if user has completed KYC
 */
export const requireKYC = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (req.user.kyc_status !== 'approved') {
    throw new AppError('KYC approval required for this action', 403);
  }

  next();
});

/**
 * Middleware to check if user has connected wallet
 */
export const requireWallet = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (!req.user.wallet_address) {
    throw new AppError('Wallet connection required for this action', 400);
  }

  next();
});

/**
 * Optional authentication - doesn't throw if no token
 */
export const optionalAuth = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = JWTUtil.extractTokenFromHeader(authHeader);
    const decoded = JWTUtil.verifyToken(token);
    
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', decoded.userId)
      .single();

    if (!error && user) {
      req.user = user as User;
      req.token = token;
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed:', error);
  }
  
  next();
});

/**
 * Rate limiting per user
 */
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.user_id || req.ip;
    const now = Date.now();
    const userRequests = requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (userRequests.count >= maxRequests) {
      throw new AppError('Rate limit exceeded. Please try again later.', 429);
    }

    userRequests.count++;
    next();
  });
};