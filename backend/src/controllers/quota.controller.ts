import { Request, Response } from 'express';
import supabaseService from '../services/supabase.service';
import quotaService from '../services/quota.service';
import logger from '../utils/logger';

export class QuotaController {
  /**
   * GET /api/quota/summary
   * Get user's quota summary
   */
  async getSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      // Get subscription
      let subscription = await supabaseService.getSubscription(userId);

      // Create FREE tier if doesn't exist
      if (!subscription) {
        subscription = await supabaseService.createSubscription(userId, 'FREE');
      }

      // Get usage
      const usage = await supabaseService.getUsageRecord(userId, subscription.id);

      // Calculate summary
      const summary = quotaService.calculateSummary(subscription, usage);

      res.json({ success: true, summary });
    } catch (error: any) {
      logger.error('Error getting quota summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  }

  /**
   * POST /api/quota/check
   * Check if user can perform action
   */
  async check(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { feature, amount = 1 } = req.body;

      if (!feature) {
        return res.status(400).json({
          success: false,
          error: 'Missing feature parameter',
        });
      }

      // Get subscription and usage
      const subscription = await supabaseService.getSubscription(userId);
      const usage = subscription
        ? await supabaseService.getUsageRecord(userId, subscription.id)
        : null;

      // Calculate summary
      const summary = quotaService.calculateSummary(subscription, usage);

      // Check if can perform
      const canUse = quotaService.canPerformAction(summary, feature, amount);
      const quotaInfo = (summary as any)[feature];

      res.json({
        success: true,
        canUse,
        remaining: quotaInfo?.remaining ?? 0,
        limit: quotaInfo?.limit ?? 0,
      });
    } catch (error: any) {
      logger.error('Error checking quota:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  }

  /**
   * POST /api/quota/track
   * Track usage
   */
  async track(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { feature, amount = 1 } = req.body;

      if (!feature || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing feature or amount',
        });
      }

      // Increment usage
      await supabaseService.incrementUsage(userId, feature, amount);

      res.json({ success: true });
    } catch (error: any) {
      logger.error('Error tracking usage:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  }
}

export default new QuotaController();
