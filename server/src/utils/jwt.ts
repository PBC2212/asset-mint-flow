import jwt from 'jsonwebtoken';
import { logger } from './logger.js';
import { JWTPayload, User } from '../types/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

export class JWTUtil {
  /**
   * Generate JWT token for user
   */
  static generateToken(user: User): string {
    try {
      const payload: JWTPayload = {
        userId: user.user_id,
        email: user.email
      };

      const token = jwt.sign(payload, JWT_SECRET!, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'rwa-platform',
        audience: 'rwa-platform-users'
      });

      logger.info(`Token generated for user: ${user.email}`);
      return token;
    } catch (error: any) {
      logger.error('Failed to generate JWT token:', error);
      throw new AppError('Token generation failed', 500);
    }
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(user: User): string {
    try {
      const payload: JWTPayload = {
        userId: user.user_id,
        email: user.email
      };

      const token = jwt.sign(payload, JWT_SECRET!, {
        expiresIn: '30d', // Longer expiry for refresh tokens
        issuer: 'rwa-platform',
        audience: 'rwa-platform-refresh'
      });

      return token;
    } catch (error: any) {
      logger.error('Failed to generate refresh token:', error);
      throw new AppError('Refresh token generation failed', 500);
    }
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET!, {
        issuer: 'rwa-platform',
        audience: 'rwa-platform-users'
      }) as JWTPayload;

      return decoded;
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid token', 401);
      } else if (error.name === 'TokenExpiredError') {
        throw new AppError('Token expired', 401);
      } else {
        logger.error('Token verification failed:', error);
        throw new AppError('Token verification failed', 401);
      }
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET!, {
        issuer: 'rwa-platform',
        audience: 'rwa-platform-refresh'
      }) as JWTPayload;

      return decoded;
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid refresh token', 401);
      } else if (error.name === 'TokenExpiredError') {
        throw new AppError('Refresh token expired', 401);
      } else {
        logger.error('Refresh token verification failed:', error);
        throw new AppError('Refresh token verification failed', 401);
      }
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization header missing or invalid', 401);
    }

    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Decode token without verification (for expired token info)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      logger.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }
}