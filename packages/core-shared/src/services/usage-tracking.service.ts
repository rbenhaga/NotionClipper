/**
 * Usage Tracking Service
 *
 * Tracks user usage (clips, files, modes) for quota management
 *
 * Design Philosophy (Apple/Notion):
 * - Précision et fiabilité du tracking
 * - Performance optimale (batch updates)
 * - Traçabilité complète pour analytics
 * - Résilient aux erreurs
 */

import {
  UsageRecord,
  UsageEvent,
  UsageEventType,
  ModeSession,
} from '../types/subscription.types';

import { FeatureType } from '../config/subscription.config';

type SupabaseClient = any;

export interface IUsageTrackingService {
  initialize(): Promise<void>;

  // Tracking de base
  track(feature: string, amount: number): Promise<void>;
  trackClip(wordCount: number, isMultipleSelection: boolean, pageCount: number): Promise<void>;
  trackFileUpload(fileSize: number, fileType: string): Promise<void>;
  trackFocusModeStart(): Promise<ModeSession>;
  trackFocusModeEnd(sessionId: string): Promise<ModeSession>;
  trackCompactModeStart(): Promise<ModeSession>;
  trackCompactModeEnd(sessionId: string): Promise<ModeSession>;

  // Analytics
  getCurrentUsage(): Promise<UsageRecord>;
  getUsageHistory(months: number): Promise<UsageRecord[]>;
  getActiveModeSessions(): Promise<ModeSession[]>;

  // Événements
  logEvent(eventType: UsageEventType, feature: FeatureType, metadata?: any): Promise<void>;
}

export class UsageTrackingService implements IUsageTrackingService {
  private supabaseClient: SupabaseClient | null = null;
  private currentUsage: UsageRecord | null = null;
  private activeModeSession: ModeSession | null = null;
  private getUserId: (() => Promise<string | null>) | null = null; // 🆕 Callback to get userId

  constructor(
    private readonly getSupabaseClient: () => SupabaseClient,
    private readonly supabaseUrl?: string,
    private readonly supabaseKey?: string
  ) {}

  /**
   * 🆕 Set callback to get userId (for custom OAuth flows)
   */
  setGetUserIdCallback(callback: () => Promise<string | null>): void {
    this.getUserId = callback;
  }

  async initialize(): Promise<void> {
    this.supabaseClient = this.getSupabaseClient();

    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    // Charger l'usage actuel
    await this.loadCurrentUsage();
  }

  /**
   * Charge l'usage record du mois courant
   */
  private async loadCurrentUsage(): Promise<void> {
    const { data: { user } } = await this.supabaseClient.auth.getUser();

    if (!user) {
      return;
    }

    // Récupérer la subscription
    const { data: subscription } = await this.supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!subscription) {
      return;
    }

    // Récupérer ou créer l'usage record du mois
    const { data, error } = await this.supabaseClient.rpc(
      'get_or_create_current_usage_record',
      {
        p_user_id: user.id,
        p_subscription_id: subscription.id,
      }
    );

    if (!error && data) {
      // 🔧 FIX: RPC functions with RETURNS SETOF return an array
      const record = Array.isArray(data) ? data[0] : data;
      if (record) {
        this.currentUsage = this.mapToUsageRecord(record);
      }
    }
  }

  /**
   * Récupère l'usage actuel
   */
  async getCurrentUsage(): Promise<UsageRecord> {
    if (!this.currentUsage) {
      await this.loadCurrentUsage();
    }

    if (!this.currentUsage) {
      throw new Error('Failed to load current usage');
    }

    return this.currentUsage;
  }

  /**
   * Track usage générique - méthode publique pour incrémenter n'importe quelle feature
   */
  async track(feature: string, amount: number = 1): Promise<void> {
    try {
      let userId: string | null = null;

      // 🔒 SECURITY FIX: Try custom getUserId callback first (for custom OAuth flows)
      if (this.getUserId) {
        userId = await this.getUserId();
        if (!userId) {
          console.warn('[UsageTracking] ⚠️ Cannot track usage - getUserId callback returned null');
          return;
        }
      } else {
        // Fallback to Supabase Auth (standard flow)
        const { data: { user }, error: authError } = await this.supabaseClient.auth.getUser();

        if (authError || !user) {
          console.warn('[UsageTracking] ⚠️ Cannot track usage - user not authenticated:', authError?.message || 'No user');
          // Don't throw - fail silently for offline/anonymous users
          return;
        }
        userId = user.id;
      }

      // Incrémenter le compteur via la fonction SQL
      const { data, error } = await this.supabaseClient.rpc(
        'increment_usage_counter',
        {
          p_user_id: userId,
          p_feature: feature,
          p_increment: amount,
        }
      );

      if (error) {
        console.error('[UsageTracking] ❌ Error incrementing usage:', error);
        throw error;
      }

      // 🔧 FIX: RPC functions with RETURNS TABLE return an array
      const record = Array.isArray(data) ? data[0] : data;
      if (record) {
        // Mettre à jour le cache
        this.currentUsage = this.mapToUsageRecord(record);
        console.log(`[UsageTracking] ✅ Tracked ${feature} +${amount} (total: ${record.used}/${record.limit})`);
      }
    } catch (error) {
      console.error('[UsageTracking] ❌ Unexpected error in track():', error);
      // Don't throw - fail gracefully
    }
  }

  /**
   * Track un clip envoyé
   */
  async trackClip(
    wordCount: number,
    isMultipleSelection: boolean,
    pageCount: number
  ): Promise<void> {
    const { data: { user } } = await this.supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('No authenticated user');
    }

    // Incrémenter le compteur via la fonction SQL
    const { data, error } = await this.supabaseClient.rpc(
      'increment_usage_counter',
      {
        p_user_id: user.id,
        p_feature: 'clips',
        p_increment: 1,
      }
    );

    if (error) {
      throw error;
    }

    // 🔧 FIX: RPC functions with RETURNS TABLE return an array
    const record = Array.isArray(data) ? data[0] : data;
    if (record) {
      // Mettre à jour le cache
      this.currentUsage = this.mapToUsageRecord(record);
    }

    // Logger l'événement
    await this.logEvent(UsageEventType.CLIP_SENT, FeatureType.CLIPS, {
      word_count: wordCount,
      is_multiple_selection: isMultipleSelection,
      page_count: pageCount,
    });
  }

  /**
   * Track un fichier uploadé
   */
  async trackFileUpload(fileSize: number, fileType: string): Promise<void> {
    const { data: { user } } = await this.supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('No authenticated user');
    }

    // Incrémenter le compteur
    const { data, error } = await this.supabaseClient.rpc(
      'increment_usage_counter',
      {
        p_user_id: user.id,
        p_feature: 'files',
        p_increment: 1,
      }
    );

    if (error) {
      throw error;
    }

    // 🔧 FIX: RPC functions with RETURNS TABLE return an array
    const record = Array.isArray(data) ? data[0] : data;
    if (record) {
      this.currentUsage = this.mapToUsageRecord(record);
    }

    // Logger l'événement
    await this.logEvent(UsageEventType.FILE_UPLOADED, FeatureType.FILES, {
      file_size: fileSize,
      file_type: fileType,
    });
  }

  /**
   * Démarre une session Focus Mode
   */
  async trackFocusModeStart(): Promise<ModeSession> {
    return await this.startModeSession('focus');
  }

  /**
   * Termine une session Focus Mode
   */
  async trackFocusModeEnd(sessionId: string): Promise<ModeSession> {
    return await this.endModeSession(sessionId, 'focus');
  }

  /**
   * Démarre une session Compact Mode
   */
  async trackCompactModeStart(): Promise<ModeSession> {
    return await this.startModeSession('compact');
  }

  /**
   * Termine une session Compact Mode
   */
  async trackCompactModeEnd(sessionId: string): Promise<ModeSession> {
    return await this.endModeSession(sessionId, 'compact');
  }

  /**
   * Démarre une session de mode
   */
  private async startModeSession(
    modeType: 'focus' | 'compact'
  ): Promise<ModeSession> {
    const { data: { user } } = await this.supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('No authenticated user');
    }

    // Récupérer la subscription et l'usage record
    const { data: subscription } = await this.supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const usage = await this.getCurrentUsage();

    // Créer la session
    const { data, error } = await this.supabaseClient
      .from('mode_sessions')
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        usage_record_id: usage.id,
        mode_type: modeType,
        started_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const session = this.mapToModeSession(data);
    this.activeModeSession = session;

    // Logger l'événement
    const eventType =
      modeType === 'focus'
        ? UsageEventType.FOCUS_MODE_STARTED
        : UsageEventType.COMPACT_MODE_STARTED;

    const feature =
      modeType === 'focus'
        ? FeatureType.FOCUS_MODE_TIME
        : FeatureType.COMPACT_MODE_TIME;

    await this.logEvent(eventType, feature);

    return session;
  }

  /**
   * Termine une session de mode
   */
  private async endModeSession(
    sessionId: string,
    modeType: 'focus' | 'compact'
  ): Promise<ModeSession> {
    const { data: { user } } = await this.supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('No authenticated user');
    }

    // Récupérer la session
    const { data: sessionData } = await this.supabaseClient
      .from('mode_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!sessionData) {
      throw new Error('Session not found');
    }

    const startedAt = new Date(sessionData.started_at);
    const endedAt = new Date();
    const durationMinutes = Math.round(
      (endedAt.getTime() - startedAt.getTime()) / (1000 * 60)
    );

    // Mettre à jour la session
    const { data, error } = await this.supabaseClient
      .from('mode_sessions')
      .update({
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes,
        is_active: false,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Incrémenter le compteur de minutes
    const feature =
      modeType === 'focus' ? 'focus_mode_minutes' : 'compact_mode_minutes';

    const { data: updatedUsage } = await this.supabaseClient.rpc(
      'increment_usage_counter',
      {
        p_user_id: user.id,
        p_feature: feature,
        p_increment: durationMinutes,
      }
    );

    if (updatedUsage) {
      // 🔧 FIX: RPC functions with RETURNS TABLE return an array
      const record = Array.isArray(updatedUsage) ? updatedUsage[0] : updatedUsage;
      if (record) {
        this.currentUsage = this.mapToUsageRecord(record);
      }
    }

    // Logger l'événement
    const eventType =
      modeType === 'focus'
        ? UsageEventType.FOCUS_MODE_ENDED
        : UsageEventType.COMPACT_MODE_ENDED;

    const featureType =
      modeType === 'focus'
        ? FeatureType.FOCUS_MODE_TIME
        : FeatureType.COMPACT_MODE_TIME;

    await this.logEvent(eventType, featureType, {
      duration_minutes: durationMinutes,
    });

    this.activeModeSession = null;

    return this.mapToModeSession(data);
  }

  /**
   * Récupère les sessions de mode actives
   */
  async getActiveModeSessions(): Promise<ModeSession[]> {
    const { data: { user } } = await this.supabaseClient.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await this.supabaseClient
      .from('mode_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    return (data || []).map(this.mapToModeSession);
  }

  /**
   * Récupère l'historique d'usage
   */
  async getUsageHistory(months: number): Promise<UsageRecord[]> {
    const { data: { user } } = await this.supabaseClient.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await this.supabaseClient
      .from('usage_records')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(months);

    if (error) {
      throw error;
    }

    return (data || []).map(this.mapToUsageRecord);
  }

  /**
   * Log un événement d'usage
   */
  async logEvent(
    eventType: UsageEventType,
    feature: FeatureType,
    metadata?: any
  ): Promise<void> {
    const { data: { user } } = await this.supabaseClient.auth.getUser();

    if (!user) {
      return;
    }

    const { data: subscription } = await this.supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!subscription) {
      return;
    }

    const usage = await this.getCurrentUsage();

    await this.supabaseClient.from('usage_events').insert({
      user_id: user.id,
      subscription_id: subscription.id,
      usage_record_id: usage.id,
      event_type: eventType,
      feature,
      metadata: metadata || {},
    });
  }

  /**
   * Mapping vers UsageRecord
   */
  private mapToUsageRecord(data: any): UsageRecord {
    return {
      id: data.id,
      user_id: data.user_id,
      subscription_id: data.subscription_id,
      period_start: new Date(data.period_start),
      period_end: new Date(data.period_end),
      year: data.year,
      month: data.month,
      clips_count: data.clips_count,
      files_count: data.files_count,
      focus_mode_minutes: data.focus_mode_minutes,
      compact_mode_minutes: data.compact_mode_minutes,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Mapping vers ModeSession
   */
  private mapToModeSession(data: any): ModeSession {
    return {
      id: data.id,
      user_id: data.user_id,
      mode_type: data.mode_type,
      started_at: new Date(data.started_at),
      ended_at: data.ended_at ? new Date(data.ended_at) : undefined,
      duration_minutes: data.duration_minutes,
      is_active: data.is_active,
      was_interrupted: data.was_interrupted,
    };
  }
}
