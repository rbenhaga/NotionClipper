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

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
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
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
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
      console.error(`[BackendAPI] Request failed: ${endpoint}`, error);
      throw error;
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
   * Check if action is allowed
   */
  async checkQuota(
    feature: 'clips' | 'files' | 'focus_mode_time' | 'compact_mode_time',
    amount: number
  ): Promise<{ canUse: boolean; remaining: number }> {
    const response = await this.request<{
      success: boolean;
      canUse: boolean;
      remaining: number;
    }>('/api/quota/check', {
      method: 'POST',
      body: JSON.stringify({ feature, amount }),
    });

    return {
      canUse: response.canUse,
      remaining: response.remaining,
    };
  }

  /**
   * Track usage
   * Replaces: usageTrackingService.track()
   */
  async trackUsage(feature: string, amount: number): Promise<void> {
    await this.request('/api/quota/track', {
      method: 'POST',
      body: JSON.stringify({ feature, amount }),
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
export const backendApiService = new BackendApiService(
  process.env.BACKEND_API_URL || 'http://localhost:3001'
);

export default backendApiService;
