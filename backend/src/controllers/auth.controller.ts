import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { supabaseService } from '../services/supabase.service';
import logger from '../utils/logger';

export class AuthController {
  /**
   * Login with email/password or OAuth code
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, provider, code, workspace_id } = req.body;

      // Validate input
      if (!email && !provider) {
        res.status(400).json({
          success: false,
          error: 'Email or provider is required'
        });
        return;
      }

      let userId: string;
      let userEmail: string;

      // OAuth flow (Notion, Google)
      if (provider && code) {
        // TODO: Implement OAuth token exchange
        // For now, this is a placeholder - the actual OAuth flow
        // should verify the code with the provider and get user info

        logger.warn('OAuth flow not yet implemented, using workspace_id as userId');

        if (!workspace_id) {
          res.status(400).json({
            success: false,
            error: 'workspace_id required for OAuth flow'
          });
          return;
        }

        userId = workspace_id;
        userEmail = email || `${workspace_id}@notion.so`;
      }
      // Email/password flow
      else if (email && password) {
        // TODO: Implement email/password authentication
        // For now, this is a placeholder

        logger.warn('Email/password auth not yet implemented');

        res.status(501).json({
          success: false,
          error: 'Email/password authentication not yet implemented'
        });
        return;
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid authentication parameters'
        });
        return;
      }

      // Get or create subscription
      let subscription = await supabaseService.getSubscription(userId);
      if (!subscription) {
        subscription = await supabaseService.createSubscription(userId, 'FREE');
        logger.info(`Created new subscription for user ${userId}`);
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: userId,
          email: userEmail,
          tier: subscription.tier
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiresIn
        } as any
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        {
          id: userId,
          type: 'refresh'
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.refreshExpiresIn
        } as any
      );

      logger.info(`User logged in: ${userId}`);

      res.json({
        success: true,
        token,
        refreshToken,
        userId,
        email: userEmail,
        subscription: {
          tier: subscription.tier,
          status: subscription.status
        }
      });
    } catch (error: any) {
      logger.error('Error during login:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'No refresh token provided'
        });
        return;
      }

      const refreshToken = authHeader.substring(7);

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;

      if (decoded.type !== 'refresh') {
        res.status(401).json({
          success: false,
          error: 'Invalid token type'
        });
        return;
      }

      const userId = decoded.id;

      // Get current subscription
      const subscription = await supabaseService.getSubscription(userId);

      if (!subscription) {
        res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
        return;
      }

      // Generate new access token
      const token = jwt.sign(
        {
          id: userId,
          email: decoded.email,
          tier: subscription.tier
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiresIn
        } as any
      );

      logger.info(`Token refreshed for user: ${userId}`);

      res.json({
        success: true,
        token
      });
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token'
        });
        return;
      }

      logger.error('Error refreshing token:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get current user info
   * GET /api/auth/me
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;

      // Get subscription
      const subscription = await supabaseService.getSubscription(userId);

      if (!subscription) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        user: {
          id: userId,
          email: (req as any).user.email,
          subscription: {
            tier: subscription.tier,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end
          }
        }
      });
    } catch (error: any) {
      logger.error('Error getting user info:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const authController = new AuthController();
