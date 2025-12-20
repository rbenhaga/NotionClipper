/**
 * Backend API Service
 *
 * This service replaces direct Supabase calls with secure backend API calls.
 * All business logic and quota enforcement now happens server-side.
 *
 * Migration Guide:
 * - Replace subscriptionService.getQuotaSummary() → backendApiService.getQuotaSummary()
 * - Replace usageTrackingService.track() → backendApiService.trackUsage()
 * - Replace subscriptionService.getCurrentSubscription() → backendApiService.getCurrentSubscription()
 */

export interface QuotaSummary {
  subscription: {
    tier: 'FREE' | 'PREMIUM';
    status: string;
    current_period_start: string;
    current_period_end: string;
  };
  usage: {
    clips: number;
    files: number;
    words_per_clip: number;
    focus_mode_time: number;
    compact_mode_time: number;
  };
  limits: {
    clips: number;
    files: number;
    words_per_clip: number;
    focus_mode_time: number;
    compact_mode_time: number;
  };
  remaining: {
    clips: number;
    files: number;
    words_per_clip: number;
    focus_mode_time: number;
    compact_mode_time: number;
  };
  percentages: {
    clips: number;
    files: number;
    words_per_clip: number;
    focus_mode_time: number;
    compact_mode_time: number;
  };
  isUnlimited: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: 'FREE' | 'PREMIUM';
  status: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface CheckoutSessionResponse {
  success: boolean;
  sessionId: string;
  url: string;
}

export interface PortalSessionResponse {
  success: boolean;
  url: string;
}

export class BackendApiService {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;

  // 🔧 FIX P0 #2: Always normalize URL to remove trailing /api
  // This ensures consistent behavior regardless of how BACKEND_API_URL is configured
  constructor(baseUrl: string = process.env.VITE_BACKEND_API_URL || process.env.BACKEND_API_URL || 'http://localhost:3001') {
    // Strip trailing /api or /api/ to ensure consistent base URL
    this.baseUrl = baseUrl.replace(/\/api\/?$/, '');
    this.loadTokensFromStorage();
  }

  /**
   * Load tokens from localStorage
   */
  private loadTokensFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.token = localStorage.getItem('backend_api_token');
      this.refreshToken = localStorage.getItem('backend_api_refresh_token');
    }
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokensToStorage(token: string, refreshToken?: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.token = token;
      localStorage.setItem('backend_api_token', token);

      if (refreshToken) {
        this.refreshToken = refreshToken;
        localStorage.setItem('backend_api_refresh_token', refreshToken);
      }
    }
  }

  /**
   * Clear tokens from localStorage
   */
  private clearTokensFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.token = null;
      this.refreshToken = null;
      localStorage.removeItem('backend_api_token');
      localStorage.removeItem('backend_api_refresh_token');
    }
  }

  /**
   * Set token manually (for custom auth flows)
   */
  setToken(token: string, refreshToken?: string): void {
    this.saveTokensToStorage(token, refreshToken);
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get user ID from JWT token
   */
  getUserId(): string | null {
    if (!this.token) {
      return null;
    }

    try {
      // Decode JWT (simple base64 decode of payload)
      const payload = JSON.parse(
        Buffer.from(this.token.split('.')[1], 'base64').toString()
      );
      return payload.userId || payload.sub || null;
    } catch (error) {
      console.error('[BackendAPI] Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Set base URL (for configuration)
   * 🔧 FIX P0 #2: Always normalize URL to remove trailing /api
   * This ensures consistent behavior regardless of how BACKEND_API_URL is configured
   */
  setBaseUrl(url: string): void {
    // Strip trailing /api or /api/ to ensure consistent base URL
    this.baseUrl = url.replace(/\/api\/?$/, '');
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Add auth token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 - try to refresh token
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry request with new token
          headers['Authorization'] = `Bearer ${this.token}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });

          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }

          return await retryResponse.json();
        } else {
          // Refresh failed, clear tokens
          this.clearTokensFromStorage();
          throw new Error('Authentication failed - please log in again');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error: any) {
      // Improve error message for network errors
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' 
          ? JSON.stringify(error) 
          : String(error);
      
      // Check if it's a network error (backend not running)
      if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        console.error(`[BackendAPI] Network error - backend may not be running: ${endpoint}`);
        throw new Error(`Backend unavailable at ${this.baseUrl}${endpoint}`);
      }
      
      console.error(`[BackendAPI] Request failed: ${endpoint}`, errorMessage);
      throw new Error(errorMessage);
    }
  }

  // ==================== AUTH ENDPOINTS ====================

  /**
   * Login with OAuth
   */
  async login(params: {
    provider: 'notion' | 'google';
    code: string;
    workspace_id: string;
    email?: string;
  }): Promise<{
    success: boolean;
    token: string;
    refreshToken: string;
    userId: string;
    email: string;
    subscription: { tier: string; status: string };
  }> {
    const response = await this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    if (response.success && response.token) {
      this.saveTokensToStorage(response.token, response.refreshToken);
    }

    return response;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.refreshToken}`,
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      if (data.success && data.token) {
        this.saveTokensToStorage(data.token);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[BackendAPI] Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<{
    success: boolean;
    user: {
      id: string;
      email: string;
      subscription: Subscription;
    };
  }> {
    return this.request('/api/auth/me');
  }

  /**
   * Logout
   */
  logout(): void {
    this.clearTokensFromStorage();
  }

  // ==================== QUOTA ENDPOINTS ====================

  /**
   * Get quota summary
   * Replaces: subscriptionService.getQuotaSummary()
   */
  async getQuotaSummary(): Promise<QuotaSummary> {
    const response = await this.request<{ success: boolean; summary: QuotaSummary }>(
      '/api/quota/summary'
    );
    return response.summary;
  }

  /**
   * Get current quota for a specific user (simplified for UI)
   */
  async getCurrentQuota(userId: string): Promise<{
    tier: 'FREE' | 'PREMIUM';
    clips_used: number;
    clips_limit: number;
    percentage: number;
  }> {
    const summary = await this.getQuotaSummary();
    return {
      tier: summary.subscription.tier,
      clips_used: summary.usage.clips,
      clips_limit: summary.limits.clips,
      percentage: summary.percentages.clips
    };
  }

  /**
   * Check if action is allowed (quota limit)
   * 🔧 FIX: Route is /api/usage/check-quota (not /api/quota/check)
   * 🔧 FIX: Backend requires userId in body
   */
  async checkQuota(
    feature: 'clips' | 'files' | 'focus_mode_minutes' | 'compact_mode_minutes',
    amount: number = 1,
    userId?: string
  ): Promise<{ canUse: boolean; remaining: number }> {
    // Get userId from parameter or from token
    const effectiveUserId = userId || this.getUserId();
    
    if (!effectiveUserId) {
      console.warn('[BackendAPI] checkQuota: No userId available, allowing by default');
      return { canUse: true, remaining: Infinity };
    }
    
    const response = await this.request<{
      success: boolean;
      allowed: boolean;
      remaining: number;
      canUse?: boolean;
    }>('/api/usage/check-quota', {
      method: 'POST',
      body: JSON.stringify({ userId: effectiveUserId, feature, amount }),
    });

    return {
      canUse: response.allowed ?? response.canUse ?? true,
      remaining: response.remaining ?? 0,
    };
  }

  /**
   * Track usage
   * Replaces: usageTrackingService.track()
   * 🔧 FIX: Route is /api/usage/track (not /api/quota/track)
   * 🔧 FIX: Backend requires userId in body
   */
  async trackUsage(
    feature: 'clips' | 'files' | 'focus_mode_minutes' | 'compact_mode_minutes',
    increment: number = 1,
    metadata?: Record<string, any>,
    userId?: string
  ): Promise<void> {
    // Get userId from parameter or from token
    const effectiveUserId = userId || this.getUserId();
    
    if (!effectiveUserId) {
      console.warn('[BackendAPI] trackUsage: No userId available, skipping');
      return;
    }
    
    await this.request('/api/usage/track', {
      method: 'POST',
      body: JSON.stringify({ userId: effectiveUserId, feature, increment, metadata }),
    });
  }
  // ==================== SUBSCRIPTION ENDPOINTS ====================

  /**
   * Get current subscription
   * Replaces: subscriptionService.getCurrentSubscription()
   */
  async getCurrentSubscription(): Promise<Subscription> {
    const response = await this.request<{ success: boolean; subscription: Subscription }>(
      '/api/subscription/current'
    );
    return response.subscription;
  }

  /**
   * Create Stripe checkout session
   * Replaces: subscriptionService.createCheckoutSession()
   */
  async createCheckoutSession(params: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    billingCycle?: 'monthly' | 'yearly';
  }): Promise<CheckoutSessionResponse> {
    return this.request('/api/subscription/create-checkout', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Create Stripe customer portal session
   * Replaces: subscriptionService.openCustomerPortal()
   */
  async createPortalSession(returnUrl: string): Promise<PortalSessionResponse> {
    return this.request('/api/subscription/portal', {
      method: 'POST',
      body: JSON.stringify({ returnUrl }),
    });
  }

  // ==================== NOTION ENDPOINTS ====================

  /**
   * Send clip to Notion (with server-side quota enforcement)
   */
  async sendClip(params: {
    pageId: string;
    content: any;
    type: string;
    notionToken: string;
  }): Promise<{ success: boolean; blockId?: string }> {
    return this.request('/api/notion/send-clip', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Upload file to Notion (with server-side quota enforcement)
   */
  async uploadFile(params: {
    pageId: string;
    fileUrl: string;
    fileName: string;
    fileSize?: number;
    notionToken: string;
  }): Promise<{ success: boolean; blockId?: string; url: string }> {
    return this.request('/api/notion/upload-file', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Batch send clips/files to Notion (with server-side quota enforcement)
   */
  async batchSend(params: {
    pageId: string;
    items: Array<{ type: string; content: any }>;
    notionToken: string;
  }): Promise<{
    success: boolean;
    clipsSent: number;
    filesSent: number;
  }> {
    return this.request('/api/notion/batch-send', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

// Singleton instance
// 🔧 FIX: Remove /api suffix - endpoints already include /api prefix
export const backendApiService = new BackendApiService(
  process.env.VITE_BACKEND_API_URL || process.env.BACKEND_API_URL || 'http://localhost:3001'
);

export default backendApiService;
