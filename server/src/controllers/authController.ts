import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { JWTUtil } from '../utils/jwt.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';
import { stellarService } from '../services/stellarService.js';
import { User, LoginCredentials, RegisterCredentials } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { Keypair } from '@stellar/stellar-sdk';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  fullName: z.string().min(2).max(100).trim()
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1)
});

const walletConnectionSchema = z.object({
  publicKey: z.string().min(56).max(56), // Stellar public keys are 56 characters
  signature: z.string().optional() // For signature verification
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
});

export class AuthController {
  /**
   * Register new user
   */
  static register = catchAsync(async (req: Request, res: Response) => {
    const { email, password, fullName } = registerSchema.parse(req.body);

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName
      }
    });

    if (authError || !authUser.user) {
      logger.error('Failed to create auth user:', authError);
      throw new AppError('Failed to create user account', 500);
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authUser.user.id,
        email,
        full_name: fullName,
        kyc_status: 'pending'
      })
      .select()
      .single();

    if (profileError || !profile) {
      logger.error('Failed to create user profile:', profileError);
      
      // Cleanup auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      
      throw new AppError('Failed to create user profile', 500);
    }

    // Generate tokens
    const accessToken = JWTUtil.generateToken(profile as User);
    const refreshToken = JWTUtil.generateRefreshToken(profile as User);

    logger.info(`User registered successfully: ${email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          kycStatus: profile.kyc_status,
          walletAddress: profile.wallet_address,
          createdAt: profile.created_at
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  });

  /**
   * Login user
   */
  static login = catchAsync(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      throw new AppError('Invalid email or password', 401);
    }

    // Verify password with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate tokens
    const accessToken = JWTUtil.generateToken(profile as User);
    const refreshToken = JWTUtil.generateRefreshToken(profile as User);

    // Update last login
    await supabaseAdmin
      .from('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', profile.user_id);

    logger.info(`User logged in: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          kycStatus: profile.kyc_status,
          walletAddress: profile.wallet_address,
          createdAt: profile.created_at
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  });

  /**
   * Connect Stellar wallet
   */
  static connectWallet = catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { publicKey } = walletConnectionSchema.parse(req.body);

    // Verify the public key is valid
    try {
      Keypair.fromPublicKey(publicKey);
    } catch (error) {
      throw new AppError('Invalid Stellar public key', 400);
    }

    // Check if wallet is already connected to another user
    const { data: existingWallet } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .eq('wallet_address', publicKey)
      .neq('user_id', req.user.user_id)
      .single();

    if (existingWallet) {
      throw new AppError('This wallet is already connected to another account', 400);
    }

    // Get account info from Stellar network
    let accountExists = false;
    try {
      await stellarService.getAccountInfo(publicKey);
      accountExists = true;
    } catch (error) {
      // Account doesn't exist yet, which is fine
      logger.info(`Wallet ${publicKey} not yet funded on Stellar network`);
    }

    // Update user profile with wallet address
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        wallet_address: publicKey,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.user_id)
      .select()
      .single();

    if (error || !updatedProfile) {
      logger.error('Failed to update wallet address:', error);
      throw new AppError('Failed to connect wallet', 500);
    }

    // If account exists, check PLAT balance
    let platBalance = '0';
    if (accountExists) {
      try {
        platBalance = await stellarService.getPlatBalance(publicKey);
      } catch (error) {
        logger.warn(`Failed to get PLAT balance for ${publicKey}:`, error);
      }
    }

    logger.info(`Wallet connected for user ${req.user.email}: ${publicKey}`);

    res.status(200).json({
      success: true,
      message: 'Wallet connected successfully',
      data: {
        walletAddress: publicKey,
        accountExists,
        platBalance,
        needsTrustline: accountExists && platBalance === '0'
      }
    });
  });

  /**
   * Refresh access token
   */
  static refreshToken = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    const decoded = JWTUtil.verifyRefreshToken(refreshToken);

    // Get user profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', decoded.userId)
      .single();

    if (error || !profile) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Generate new tokens
    const accessToken = JWTUtil.generateToken(profile as User);
    const newRefreshToken = JWTUtil.generateRefreshToken(profile as User);

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      }
    });
  });

  /**
   * Get current user profile
   */
  static getProfile = catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Get wallet info if connected
    let walletInfo = null;
    if (req.user.wallet_address) {
      try {
        const accountInfo = await stellarService.getAccountInfo(req.user.wallet_address);
        const platBalance = await stellarService.getPlatBalance(req.user.wallet_address);
        
        walletInfo = {
          publicKey: req.user.wallet_address,
          platBalance,
          xlmBalance: accountInfo.balance.find(b => b.asset_type === 'native')?.balance || '0',
          accountExists: true
        };
      } catch (error) {
        walletInfo = {
          publicKey: req.user.wallet_address,
          platBalance: '0',
          xlmBalance: '0',
          accountExists: false
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          fullName: req.user.full_name,
          kycStatus: req.user.kyc_status,
          walletAddress: req.user.wallet_address,
          createdAt: req.user.created_at,
          updatedAt: req.user.updated_at
        },
        wallet: walletInfo
      }
    });
  });

  /**
   * Logout user
   */
  static logout = catchAsync(async (req: Request, res: Response) => {
    // In a production app, you might want to blacklist the JWT token
    // For now, we'll just return success and let the client delete the token
    
    logger.info(`User logged out: ${req.user?.email || 'unknown'}`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  /**
   * Update user profile
   */
  static updateProfile = catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const updateSchema = z.object({
      fullName: z.string().min(2).max(100).trim().optional()
    });

    const { fullName } = updateSchema.parse(req.body);

    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (fullName !== undefined) {
      updates.full_name = fullName;
    }

    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('user_id', req.user.user_id)
      .select()
      .single();

    if (error || !updatedProfile) {
      logger.error('Failed to update profile:', error);
      throw new AppError('Failed to update profile', 500);
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          fullName: updatedProfile.full_name,
          kycStatus: updatedProfile.kyc_status,
          walletAddress: updatedProfile.wallet_address,
          updatedAt: updatedProfile.updated_at
        }
      }
    });
  });
}