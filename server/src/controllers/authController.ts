import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.ts';
import { JWTUtil } from '../utils/jwt.ts';
import { AppError, catchAsync } from '../middleware/errorHandler.ts';
import { stellarService } from '../services/stellarService.ts';
import { logger } from '../utils/logger.ts';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).optional(),
  fullName: z.string().min(2).optional(),
  acceptTerms: z.boolean().refine(val => val === true, 'Must accept terms'),
  acceptPrivacyPolicy: z.boolean().refine(val => val === true, 'Must accept privacy policy')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional()
});

const connectWalletSchema = z.object({
  walletAddress: z.string().min(56).max(56),
  signature: z.string().min(1),
  message: z.string().min(1)
});

export class AuthController {
  static register = catchAsync(async (req: any, res: any) => {
    const userData = registerSchema.parse(req.body);

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        email: userData.email,
        username: userData.username,
        full_name: userData.fullName,
        password_hash: hashedPassword,
        kyc_status: 'pending',
        kyc_level: 0,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !user) {
      logger.error('User registration failed:', error);
      throw new AppError('Registration failed', 500);
    }

    // Generate tokens
    const tokens = JWTUtil.generateTokens({
      userId: user.user_id,
      email: user.email,
      walletAddress: user.wallet_address,
      kycStatus: user.kyc_status
    });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          kycStatus: user.kyc_status,
          isActive: user.is_active,
          createdAt: user.created_at
        },
        tokens
      }
    });
  });

  static login = catchAsync(async (req: any, res: any) => {
    const { email, password, rememberMe } = loginSchema.parse(req.body);

    // Get user with password
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.is_active) {
      throw new AppError('Account is deactivated', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // Update last login
    await supabaseAdmin
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', user.user_id);

    // Generate tokens
    const tokens = JWTUtil.generateTokens({
      userId: user.user_id,
      email: user.email,
      walletAddress: user.wallet_address,
      kycStatus: user.kyc_status
    });

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          walletAddress: user.wallet_address,
          kycStatus: user.kyc_status,
          kycLevel: user.kyc_level,
          isActive: user.is_active,
          lastLogin: user.last_login
        },
        tokens
      }
    });
  });

  static getProfile = catchAsync(async (req: any, res: any) => {
    const user = req.user;

    res.status(200).json({
      success: true,
      data: {
        user: {
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
          walletAddress: user.wallet_address,
          kycStatus: user.kyc_status,
          kycLevel: user.kyc_level,
          isActive: user.is_active,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          preferences: user.preferences
        }
      }
    });
  });

  static updateProfile = catchAsync(async (req: any, res: any) => {
    const updateSchema = z.object({
      username: z.string().min(3).optional(),
      fullName: z.string().min(2).optional(),
      avatarUrl: z.string().url().optional(),
      preferences: z.object({
        theme: z.enum(['light', 'dark', 'system']).optional(),
        language: z.string().optional(),
        currency: z.string().optional(),
        notifications: z.object({
          email: z.boolean(),
          push: z.boolean(),
          sms: z.boolean()
        }).optional(),
        privacy: z.object({
          showProfile: z.boolean(),
          showActivity: z.boolean()
        }).optional()
      }).optional()
    });

    const updates = updateSchema.parse(req.body);
    const userId = req.user.user_id;

    const { data: updatedUser, error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !updatedUser) {
      throw new AppError('Failed to update profile', 500);
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          email: updatedUser.email,
          username: updatedUser.username,
          fullName: updatedUser.full_name,
          avatarUrl: updatedUser.avatar_url,
          walletAddress: updatedUser.wallet_address,
          kycStatus: updatedUser.kyc_status,
          preferences: updatedUser.preferences,
          updatedAt: updatedUser.updated_at
        }
      }
    });
  });

  static connectWallet = catchAsync(async (req: any, res: any) => {
    const { walletAddress, signature, message } = connectWalletSchema.parse(req.body);
    const userId = req.user.user_id;

    // Verify wallet signature
    const isValidSignature = JWTUtil.verifyWalletSignature(walletAddress, signature, message);
    if (!isValidSignature) {
      throw new AppError('Invalid wallet signature', 400);
    }

    // Check if wallet is already connected to another user
    const { data: existingWallet } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .eq('wallet_address', walletAddress)
      .neq('user_id', userId)
      .single();

    if (existingWallet) {
      throw new AppError('Wallet is already connected to another account', 400);
    }

    // Update user with wallet address
    const { data: updatedUser, error } = await supabaseAdmin
      .from('profiles')
      .update({
        wallet_address: walletAddress,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !updatedUser) {
      throw new AppError('Failed to connect wallet', 500);
    }

    logger.info(`Wallet connected for user ${req.user.email}: ${walletAddress}`);

    res.status(200).json({
      success: true,
      message: 'Wallet connected successfully',
      data: {
        walletAddress: updatedUser.wallet_address,
        connectedAt: updatedUser.updated_at
      }
    });
  });

  static refreshToken = catchAsync(async (req: any, res: any) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    try {
      const newTokens = await JWTUtil.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: newTokens
      });
    } catch (error) {
      throw new AppError('Invalid or expired refresh token', 401);
    }
  });

  static logout = catchAsync(async (req: any, res: any) => {
    // In a more complete implementation, you would invalidate the refresh token here
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  });
}