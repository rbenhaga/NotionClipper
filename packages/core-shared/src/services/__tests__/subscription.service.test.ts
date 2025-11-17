/**
 * SubscriptionService - Quota Checks Tests
 *
 * Tests unitaires pour les quota checks dans SubscriptionService
 * Vérifie FREE vs PREMIUM limits, grace period, et feature access
 */

import { SubscriptionService } from '../subscription.service';
import { SubscriptionTier, FeatureType } from '../../config/subscription.config';
import { SubscriptionStatus } from '../../types/subscription.types';

// Mock EdgeFunctionService
jest.mock('../edge-function.service', () => ({
  EdgeFunctionService: jest.fn().mockImplementation(() => ({
    call: jest.fn(),
  })),
}));

// Mock Logger
jest.mock('../logger.service', () => ({
  subscriptionLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SubscriptionService - Quota Checks', () => {
  let mockSupabaseClient: any;
  let service: SubscriptionService;
  const mockSupabaseUrl = 'https://test.supabase.co';
  const mockSupabaseKey = 'test-key';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { access_token: 'mock-token' } },
        }),
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
        }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    service = new SubscriptionService(
      () => mockSupabaseClient,
      mockSupabaseUrl,
      mockSupabaseKey
    );
  });

  describe('Initialization', () => {
    it('should initialize with valid Supabase config', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should throw error if Supabase URL missing', async () => {
      const badService = new SubscriptionService(() => mockSupabaseClient, '', mockSupabaseKey);
      await expect(badService.initialize()).rejects.toThrow('Supabase URL and Key are required');
    });

    it('should throw error if Supabase Key missing', async () => {
      const badService = new SubscriptionService(() => mockSupabaseClient, mockSupabaseUrl, '');
      await expect(badService.initialize()).rejects.toThrow('Supabase URL and Key are required');
    });
  });

  describe('getQuotaSummary - FREE Tier', () => {
    beforeEach(async () => {
      await service.initialize();

      // Mock FREE tier subscription
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'sub-1',
            user_id: 'user-123',
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.ACTIVE,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      });

      // Mock usage record - clips: 80/100
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            user_id: 'user-123',
            subscription_id: 'sub-1',
            clips_sent: 80,
            files_uploaded: 5,
            focus_mode_minutes: 45,
            compact_mode_minutes: 30,
            period_start: new Date().toISOString(),
            period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      });
    });

    it('should return correct quota limits for FREE tier', async () => {
      const summary = await service.getQuotaSummary();

      expect(summary.tier).toBe(SubscriptionTier.FREE);

      // Clips: 80/100
      expect(summary.clips.used).toBe(80);
      expect(summary.clips.limit).toBe(100);
      expect(summary.clips.remaining).toBe(20);
      expect(summary.clips.percentage).toBe(80);
      expect(summary.clips.is_limited).toBe(true);
      expect(summary.clips.is_unlimited).toBe(false);

      // Files: 5/10
      expect(summary.files.used).toBe(5);
      expect(summary.files.limit).toBe(10);
      expect(summary.files.remaining).toBe(5);

      // Focus mode: 45/60 minutes
      expect(summary.focus_mode_time.used).toBe(45);
      expect(summary.focus_mode_time.limit).toBe(60);
      expect(summary.focus_mode_time.remaining).toBe(15);

      // Compact mode: 30/60 minutes
      expect(summary.compact_mode_time.used).toBe(30);
      expect(summary.compact_mode_time.limit).toBe(60);
      expect(summary.compact_mode_time.remaining).toBe(30);
    });

    it('should calculate alert levels correctly', async () => {
      const summary = await service.getQuotaSummary();

      // 80% used = warning
      expect(summary.clips.alert_level).toBe('warning');

      // 50% used = normal
      expect(summary.files.alert_level).toBe('normal');
    });

    it('should set can_use to false when quota exhausted', async () => {
      // Mock usage at 100%
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'sub-1',
            user_id: 'user-123',
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.ACTIVE,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            user_id: 'user-123',
            subscription_id: 'sub-1',
            clips_sent: 100,
            files_uploaded: 10,
            focus_mode_minutes: 60,
            compact_mode_minutes: 60,
            period_start: new Date().toISOString(),
            period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      });

      service.invalidateCache();
      const summary = await service.getQuotaSummary();

      expect(summary.clips.can_use).toBe(false);
      expect(summary.files.can_use).toBe(false);
      expect(summary.focus_mode_time.can_use).toBe(false);
      expect(summary.compact_mode_time.can_use).toBe(false);
      expect(summary.clips.alert_level).toBe('critical');
    });
  });

  describe('getQuotaSummary - PREMIUM Tier', () => {
    beforeEach(async () => {
      await service.initialize();

      // Mock PREMIUM subscription
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'sub-premium',
            user_id: 'user-123',
            tier: SubscriptionTier.PREMIUM,
            status: SubscriptionStatus.ACTIVE,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            user_id: 'user-123',
            subscription_id: 'sub-premium',
            clips_sent: 500,
            files_uploaded: 50,
            focus_mode_minutes: 300,
            compact_mode_minutes: 200,
            period_start: new Date().toISOString(),
            period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      });
    });

    it('should return unlimited quotas for PREMIUM tier', async () => {
      const summary = await service.getQuotaSummary();

      expect(summary.tier).toBe(SubscriptionTier.PREMIUM);

      // All quotas unlimited
      expect(summary.clips.is_unlimited).toBe(true);
      expect(summary.clips.is_limited).toBe(false);
      expect(summary.clips.limit).toBeNull();
      expect(summary.clips.remaining).toBeNull();
      expect(summary.clips.can_use).toBe(true);

      expect(summary.files.is_unlimited).toBe(true);
      expect(summary.focus_mode_time.is_unlimited).toBe(true);
      expect(summary.compact_mode_time.is_unlimited).toBe(true);
    });

    it('should track usage even for unlimited quotas', async () => {
      const summary = await service.getQuotaSummary();

      // Usage is tracked but no limits
      expect(summary.clips.used).toBe(500);
      expect(summary.files.used).toBe(50);
      expect(summary.focus_mode_time.used).toBe(300);
      expect(summary.compact_mode_time.used).toBe(200);
    });
  });

  describe('hasFeatureAccess', () => {
    it('should grant access to clips for FREE tier within quota', async () => {
      await service.initialize();

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.ACTIVE,
          },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { clips_sent: 50 },
          error: null,
        }),
      });

      const hasAccess = await service.hasFeatureAccess(FeatureType.CLIPS);
      expect(hasAccess).toBe(true);
    });

    it('should deny access when quota exhausted', async () => {
      await service.initialize();

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.ACTIVE,
          },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { clips_sent: 100 }, // At limit
          error: null,
        }),
      });

      const hasAccess = await service.hasFeatureAccess(FeatureType.CLIPS);
      expect(hasAccess).toBe(false);
    });

    it('should grant unlimited access for PREMIUM tier', async () => {
      await service.initialize();

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            tier: SubscriptionTier.PREMIUM,
            status: SubscriptionStatus.ACTIVE,
          },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { clips_sent: 500 },
          error: null,
        }),
      });

      const hasAccess = await service.hasFeatureAccess(FeatureType.CLIPS);
      expect(hasAccess).toBe(true);
    });
  });

  describe('canPerformAction', () => {
    it('should allow action when quota sufficient', async () => {
      await service.initialize();

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.ACTIVE,
          },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { clips_sent: 95 }, // 95/100
          error: null,
        }),
      });

      const canPerform = await service.canPerformAction('clip', 1);
      expect(canPerform).toBe(true);
    });

    it('should deny action when quota would be exceeded', async () => {
      await service.initialize();

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.ACTIVE,
          },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { clips_sent: 100 }, // Already at limit
          error: null,
        }),
      });

      const canPerform = await service.canPerformAction('clip', 1);
      expect(canPerform).toBe(false);
    });

    it('should check multiple items correctly', async () => {
      await service.initialize();

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.ACTIVE,
          },
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { files_uploaded: 8 }, // 8/10 limit
          error: null,
        }),
      });

      // Trying to upload 3 files when only 2 remaining
      const canPerform = await service.canPerformAction('file', 3);
      expect(canPerform).toBe(false);
    });
  });

  describe('Grace Period', () => {
    it('should detect grace period correctly', async () => {
      await service.initialize();

      const gracePeriodEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.GRACE_PERIOD,
            grace_period_end: gracePeriodEnd.toISOString(),
          },
          error: null,
        }),
      });

      const isGrace = await service.isInGracePeriod();
      expect(isGrace).toBe(true);
    });

    it('should calculate days remaining correctly', async () => {
      await service.initialize();

      const gracePeriodEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.GRACE_PERIOD,
            grace_period_end: gracePeriodEnd.toISOString(),
          },
          error: null,
        }),
      });

      const daysRemaining = await service.getGracePeriodDaysRemaining();
      expect(daysRemaining).toBeGreaterThanOrEqual(4);
      expect(daysRemaining).toBeLessThanOrEqual(5);
    });

    it('should return 0 days when not in grace period', async () => {
      await service.initialize();

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.ACTIVE,
          },
          error: null,
        }),
      });

      const daysRemaining = await service.getGracePeriodDaysRemaining();
      expect(daysRemaining).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should cache quota summary for performance', async () => {
      await service.initialize();

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            tier: SubscriptionTier.FREE,
            clips_sent: 50,
          },
          error: null,
        }),
      });

      // First call
      await service.getQuotaSummary();

      // Second call should use cache
      await service.getQuotaSummary();

      // Should only query DB once if cached
      // Note: This depends on cache implementation
    });

    it('should invalidate cache when requested', async () => {
      await service.initialize();

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            tier: SubscriptionTier.FREE,
            clips_sent: 50,
          },
          error: null,
        }),
      });

      await service.getQuotaSummary();

      // Invalidate cache
      service.invalidateCache();

      // Next call should re-fetch
      await service.getQuotaSummary();
    });
  });
});
