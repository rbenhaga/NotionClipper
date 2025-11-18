# Backend API Migration Guide

**Date**: 2025-11-17
**Status**: Implementation Ready
**Priority**: CRITICAL

---

## Overview

This guide provides step-by-step instructions for migrating the frontend from direct Supabase calls to the new secure backend API.

---

## What Changed

### Before (Insecure)
```typescript
// Frontend directly accessing Supabase
import { supabaseClient } from './supabase';
import { subscriptionService } from './services/subscription.service';

const subscription = await subscriptionService.getCurrentSubscription();
const quota = await subscriptionService.getQuotaSummary();
await usageTrackingService.track('clips', 1);
```

**Problems:**
- ❌ Supabase credentials exposed in frontend bundle
- ❌ Business logic in frontend (can be reverse-engineered)
- ❌ No rate limiting
- ❌ Direct database access (RLS can be bypassed)

### After (Secure)
```typescript
// Frontend calling secure backend API
import { backendApiService } from './services/backend-api.service';

const subscription = await backendApiService.getCurrentSubscription();
const quota = await backendApiService.getQuotaSummary();
await backendApiService.trackUsage('clips', 1);
```

**Benefits:**
- ✅ No exposed credentials
- ✅ Business logic on server (secure)
- ✅ Rate limiting enabled
- ✅ All database operations server-side
- ✅ Quota enforcement before API calls

---

## Migration Steps

### Step 1: Setup Backend

#### 1.1 Install Dependencies
```bash
cd backend
npm install
```

#### 1.2 Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Server
PORT=3001
NODE_ENV=development
API_URL=http://localhost:3001

# Supabase (server-side only)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key-here  # CRITICAL: Use service role key
SUPABASE_ANON_KEY=your-anon-key-here

# JWT
JWT_SECRET=your-super-secret-jwt-key-here  # Generate with: openssl rand -base64 32
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
```

#### 1.3 Build and Start Backend
```bash
npm run build
npm start

# For development:
npm run dev
```

Verify backend is running:
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"...","uptime":...}
```

---

### Step 2: Update Frontend Configuration

#### 2.1 Add Backend API URL to Frontend Environment

**File**: `apps/notion-clipper-app/.env`
```env
VITE_BACKEND_API_URL=http://localhost:3001
```

**File**: `apps/notion-clipper-app/src/config/index.ts`
```typescript
export const config = {
  // ... existing config ...
  backendApiUrl: import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001',
};
```

#### 2.2 Initialize Backend API Service

**File**: `packages/core-shared/src/services/index.ts`
```typescript
export { backendApiService, BackendApiService } from './backend-api.service';
```

---

### Step 3: Migrate Authentication Flow

#### 3.1 Replace Supabase Auth with Backend JWT

**Before**: `packages/ui/src/services/AuthDataManager.ts`
```typescript
// Old: Direct Supabase auth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'notion',
  // ...
});
```

**After**: Add backend token storage
```typescript
import { backendApiService } from '@core-shared/services';

// After OAuth callback, exchange code for JWT
async handleOAuthCallback(code: string, workspaceId: string, email: string) {
  try {
    const response = await backendApiService.login({
      provider: 'notion',
      code,
      workspace_id: workspaceId,
      email,
    });

    // Token is automatically stored by backendApiService
    console.log('Logged in:', response.userId);

    return response;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Check if user is authenticated
isAuthenticated(): boolean {
  return backendApiService.getToken() !== null;
}

// Logout
logout() {
  backendApiService.logout();
}
```

---

### Step 4: Migrate Quota & Subscription Services

#### 4.1 Replace SubscriptionService Calls

**File**: `packages/core-shared/src/services/subscription.service.ts`

**Option A: Wrapper Pattern (Recommended for gradual migration)**
```typescript
import { backendApiService } from './backend-api.service';

export class SubscriptionService {
  // ... keep existing methods for backward compatibility ...

  /**
   * Get quota summary (migrated to backend)
   */
  async getQuotaSummary(): Promise<QuotaSummary> {
    return backendApiService.getQuotaSummary();
  }

  /**
   * Get current subscription (migrated to backend)
   */
  async getCurrentSubscription(): Promise<Subscription> {
    return backendApiService.getCurrentSubscription();
  }

  /**
   * Create checkout session (migrated to backend)
   */
  async createCheckoutSession(params: CreateCheckoutPayload): Promise<CheckoutSessionResponse> {
    return backendApiService.createCheckoutSession({
      priceId: params.priceId,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      billingCycle: params.billingCycle,
    });
  }

  /**
   * Open customer portal (migrated to backend)
   */
  async openCustomerPortal(returnUrl: string): Promise<void> {
    const response = await backendApiService.createPortalSession(returnUrl);
    window.open(response.url, '_blank');
  }
}
```

**Option B: Direct Replacement (Recommended for new code)**
```typescript
// In your components, replace:
import { subscriptionService } from '@core-shared/services';
// With:
import { backendApiService } from '@core-shared/services';

// Replace calls:
const quota = await subscriptionService.getQuotaSummary();
// With:
const quota = await backendApiService.getQuotaSummary();
```

#### 4.2 Replace UsageTrackingService Calls

**File**: `packages/core-shared/src/services/usage-tracking.service.ts`

**Wrapper Pattern**:
```typescript
import { backendApiService } from './backend-api.service';

export class UsageTrackingService {
  /**
   * Track usage (migrated to backend)
   */
  async track(feature: string, amount: number = 1): Promise<void> {
    try {
      await backendApiService.trackUsage(feature, amount);
      console.log(`[UsageTracking] Tracked: ${feature} +${amount}`);
    } catch (error) {
      console.error(`[UsageTracking] Failed to track: ${feature}`, error);
      throw error;
    }
  }
}
```

**Direct Replacement**:
```typescript
// Replace:
await usageTrackingService.track('clips', 1);
// With:
await backendApiService.trackUsage('clips', 1);
```

---

### Step 5: Migrate Notion API Calls (CRITICAL)

#### 5.1 Update Notion Clip Sending

**Before**: `packages/core-electron/src/services/NotionService.ts`
```typescript
// Old: Direct Notion API call (no server-side quota check)
async sendClip(pageId: string, content: any) {
  const response = await fetch('https://api.notion.com/v1/blocks/' + pageId + '/children', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${notionToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({ children: [content] })
  });

  // Track usage AFTER send (vulnerable to bypass)
  await usageTrackingService.track('clips', 1);
}
```

**After**: Proxy through backend (quota enforced BEFORE send)
```typescript
import { backendApiService } from '@core-shared/services';

async sendClip(pageId: string, content: any, notionToken: string) {
  try {
    // Backend checks quota BEFORE calling Notion API
    const response = await backendApiService.sendClip({
      pageId,
      content,
      type: content.type,
      notionToken,
    });

    console.log('Clip sent successfully:', response.blockId);
    return response;
  } catch (error: any) {
    if (error.message.includes('Quota exceeded')) {
      console.error('Quota exceeded - cannot send clip');
      // Show quota exceeded modal
    }
    throw error;
  }
}
```

#### 5.2 Update File Uploads

**Before**: Direct file upload
```typescript
async uploadFile(pageId: string, fileUrl: string, fileName: string) {
  // Direct Notion API call
  const response = await fetch(...);

  // Track AFTER upload (vulnerable)
  await usageTrackingService.track('files', 1);
}
```

**After**: Proxy through backend
```typescript
async uploadFile(pageId: string, fileUrl: string, fileName: string, notionToken: string) {
  try {
    // Backend checks quota BEFORE uploading
    const response = await backendApiService.uploadFile({
      pageId,
      fileUrl,
      fileName,
      notionToken,
    });

    console.log('File uploaded successfully:', response.url);
    return response;
  } catch (error: any) {
    if (error.message.includes('Quota exceeded')) {
      console.error('File quota exceeded');
      // Show quota exceeded modal
    }
    throw error;
  }
}
```

---

### Step 6: Remove Supabase Client from Frontend

**CRITICAL SECURITY STEP**

#### 6.1 Remove Supabase Initialization

**File**: `apps/notion-clipper-app/src/react/src/App.tsx`

**Remove**:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://...';  // ❌ EXPOSED
const supabaseKey = '...';          // ❌ EXPOSED

const supabase = createClient(supabaseUrl, supabaseKey);
```

#### 6.2 Remove Supabase from package.json

**File**: `apps/notion-clipper-app/package.json`

Remove:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.4"  // Remove this
  }
}
```

Run:
```bash
npm uninstall @supabase/supabase-js
```

---

### Step 7: Update Component Usage

#### 7.1 Example: Settings Component

**Before**: `packages/ui/src/components/settings/SubscriptionTab.tsx`
```typescript
import { subscriptionService } from '@core-shared/services';

const loadSubscription = async () => {
  const sub = await subscriptionService.getCurrentSubscription();
  const quota = await subscriptionService.getQuotaSummary();
  setSubscription(sub);
  setQuota(quota);
};
```

**After**: Same code (if using wrapper pattern) OR
```typescript
import { backendApiService } from '@core-shared/services';

const loadSubscription = async () => {
  const sub = await backendApiService.getCurrentSubscription();
  const quota = await backendApiService.getQuotaSummary();
  setSubscription(sub);
  setQuota(quota);
};
```

#### 7.2 Example: Quota Display

**Before**:
```typescript
const { quota, loading } = useQuota(); // Uses subscriptionService internally
```

**After**: Update useQuota hook
```typescript
// File: packages/ui/src/hooks/useQuota.ts
import { backendApiService } from '@core-shared/services';

export const useQuota = () => {
  const [quota, setQuota] = useState<QuotaSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuota = async () => {
      try {
        const summary = await backendApiService.getQuotaSummary();
        setQuota(summary);
      } catch (error) {
        console.error('Failed to load quota:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuota();
  }, []);

  return { quota, loading };
};
```

---

### Step 8: Handle Authentication State

#### 8.1 Create Auth Context

**File**: `packages/ui/src/contexts/AuthContext.tsx`
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { backendApiService } from '@core-shared/services';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  login: (code: string, workspaceId: string, email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if token exists
    const token = backendApiService.getToken();
    if (token) {
      setIsAuthenticated(true);
      // Optionally verify token with backend
      backendApiService.getCurrentUser()
        .then(response => {
          setUserId(response.user.id);
        })
        .catch(() => {
          // Token invalid, logout
          logout();
        });
    }
  }, []);

  const login = async (code: string, workspaceId: string, email: string) => {
    const response = await backendApiService.login({
      provider: 'notion',
      code,
      workspace_id: workspaceId,
      email,
    });

    setIsAuthenticated(true);
    setUserId(response.userId);
  };

  const logout = () => {
    backendApiService.logout();
    setIsAuthenticated(false);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### 8.2 Wrap App with AuthProvider

**File**: `apps/notion-clipper-app/src/react/src/App.tsx`
```typescript
import { AuthProvider } from '@ui/contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

---

## Testing

### Backend Tests

```bash
cd backend

# Test health check
curl http://localhost:3001/health

# Test auth (you'll need a valid OAuth code)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"provider":"notion","code":"test","workspace_id":"test123","email":"test@example.com"}'

# Test quota (requires JWT token)
curl http://localhost:3001/api/quota/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Frontend Tests

1. **Login Flow**: Verify OAuth → JWT token storage → authenticated state
2. **Quota Display**: Verify quota loads from backend
3. **Clip Sending**: Verify quota is checked before sending
4. **File Upload**: Verify file quota is checked before uploading
5. **Stripe Checkout**: Verify checkout session redirects to Stripe
6. **Token Refresh**: Verify auto-refresh on 401 errors

---

## Rollback Plan

If issues occur, you can temporarily revert by:

1. **Keep old services** alongside new backend API service
2. **Use feature flag** to toggle between old and new
3. **Gradual migration** - migrate one feature at a time

```typescript
// Example feature flag
const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';

const getQuota = async () => {
  if (USE_BACKEND_API) {
    return backendApiService.getQuotaSummary();
  } else {
    return subscriptionService.getQuotaSummary(); // Old method
  }
};
```

---

## Security Checklist

Before going to production:

- [ ] Backend `.env` file is NOT committed to git
- [ ] Frontend bundle does NOT contain Supabase credentials
- [ ] All Notion API calls go through backend (no direct calls)
- [ ] JWT tokens are short-lived (24h or less)
- [ ] Refresh tokens are stored securely (httpOnly cookies in production)
- [ ] Rate limiting is enabled on all API endpoints
- [ ] CORS is configured to only allow your frontend domain
- [ ] Stripe webhook signature verification is enabled
- [ ] All errors are logged server-side
- [ ] SSL/TLS is enabled in production

---

## Deployment

### Backend Deployment (VPS)

```bash
# SSH into VPS
ssh user@your-vps.com

# Clone or pull latest code
cd /var/www/notion-clipper-backend
git pull

# Install dependencies
npm install --production

# Build
npm run build

# Setup environment variables
cp .env.example .env
nano .env  # Edit with production values

# Start with PM2
pm2 start dist/index.js --name notion-clipper-backend
pm2 save
pm2 startup
```

### Nginx Configuration

```nginx
server {
  listen 80;
  server_name api.yourapp.com;

  location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### Frontend Deployment

Update `.env.production`:
```env
VITE_BACKEND_API_URL=https://api.yourapp.com
```

---

## Common Issues

### Issue: 401 Unauthorized

**Cause**: JWT token expired or invalid

**Fix**:
```typescript
// Check if token refresh is working
const token = backendApiService.getToken();
console.log('Current token:', token);

// Manually refresh
await backendApiService.refreshAccessToken();
```

### Issue: CORS Error

**Cause**: Frontend URL not in CORS whitelist

**Fix**: Update backend `.env`:
```env
FRONTEND_URL=http://localhost:5173,https://yourapp.com
```

### Issue: Quota Check Failing

**Cause**: User not authenticated or subscription not created

**Fix**: Ensure login creates subscription:
```typescript
// In auth.controller.ts
let subscription = await supabaseService.getSubscription(userId);
if (!subscription) {
  subscription = await supabaseService.createSubscription(userId, 'FREE');
}
```

---

## Next Steps

After successful migration:

1. ✅ Monitor backend logs for errors
2. ✅ Set up monitoring (e.g., Sentry, LogRocket)
3. ✅ Configure SSL certificates
4. ✅ Set up automated backups
5. ✅ Implement health check monitoring
6. ✅ Configure auto-scaling (if needed)

---

**Migration Status**: Ready for Implementation
**Estimated Time**: 2-3 days for full migration
**Priority**: CRITICAL (security vulnerability fix)
