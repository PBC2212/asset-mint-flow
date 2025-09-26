import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from './logger.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class JWTUtil {
  static generateTokens(payload: any): any {
    try {
      const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'rwa-platform',
        audience: 'rwa-platform-users'
      });

      const refreshPayload = {
        userId: payload.userId,
        tokenId: crypto.randomUUID(),
        type: 'refresh'
      };

      const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'rwa-platform',
        audience: 'rwa-platform-users'
      });

      const accessTokenDecoded = jwt.decode(accessToken) as any;
      const refreshTokenDecoded = jwt.decode(refreshToken) as any;

      return {
        accessToken,
        refreshToken,
        expiresIn: accessTokenDecoded.exp,
        refreshExpiresIn: refreshTokenDecoded.exp
      };
    } catch (error) {
      logger.error('Error generating tokens:', error);
      throw new Error('Failed to generate authentication tokens');
    }
  }

  static verifyToken(token: string): any {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'rwa-platform',
        audience: 'rwa-platform-users'
      });
      return decoded;
    } catch (error: any) {
      logger.warn('Token verification failed:', error.message);
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  static extractTokenFromHeader(authHeader?: string): string {
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }
    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }
    const token = authHeader.substring(7);
    if (!token) {
      throw new Error('Token not found in authorization header');
    }
    return token;
  }
}