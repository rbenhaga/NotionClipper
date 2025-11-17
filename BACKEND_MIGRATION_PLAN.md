# Backend Migration Plan - VPS Architecture
**Date**: 2025-11-17
**Priority**: CRITICAL
**Effort**: 2-3 weeks full-time

---

## 🎯 Executive Summary

**Current State**: All backend logic runs in the Electron frontend via:
- Direct Supabase client queries (RPC, insert, update, select)
- Supabase Edge Functions (partial backend)
- Exposed API keys in frontend bundle

**Target State**: Clean REST API on VPS with:
- All business logic server-side
- API keys secured on backend
- Rate limiting & monitoring
- Better scalability

---

## 🔴 CRITICAL SECURITY ISSUES

### 1. Exposed Supabase Credentials
**Location**: Frontend bundle
**Risk**: HIGH - API keys can be extracted from app.asar

**Files Affected**:
- `apps/notion-clipper-app/src/react/src/App.tsx` (lines 196-197)
- `packages/core-shared/src/services/subscription.service.ts`
- `packages/core-shared/src/services/usage-tracking.service.ts`

### 2. Direct Database Access
**Risk**: HIGH - RLS can be bypassed, queries can be manipulated

**Operations in Frontend**:
```typescript
// subscription.service.ts
await this.supabaseClient.from('subscriptions').select('*')
await this.supabaseClient.from('subscriptions').insert({...})
await this.supabaseClient.from('subscriptions').update({...})
await this.supabaseClient.from('usage_records').insert({...})
await this.supabaseClient.rpc('get_or_create_current_usage_record', {...})
await this.supabaseClient.rpc('increment_usage_counter', {...})

// usage-tracking.service.ts
await this.supabaseClient.rpc('increment_usage_counter', {
  p_user_id: userId,
  p_feature: feature,
  p_increment: amount
})
```

### 3. Business Logic in Frontend
**Risk**: MEDIUM-HIGH - Can be reverse-engineered

**Examples**:
- Quota calculations (`calculateUsagePercentage`, `getAlertLevel`)
- Subscription tier validation
- Grace period logic
- Stripe checkout creation

---

## 📋 Backend Logic Inventory

### Critical (Must Move)
1. ✅ **Quota Enforcement**
   - File: `packages/core-shared/src/services/subscription.service.ts`
   - Lines: 518-630 (`getQuotaSummary`, `createQuotaUsage`)
   - API: `GET /api/quota/summary`

2. ✅ **Usage Tracking**
   - File: `packages/core-shared/src/services/usage-tracking.service.ts`
   - Lines: 132-181 (`track`)
   - API: `POST /api/quota/track`

3. ✅ **Subscription Management**
   - File: `packages/core-shared/src/services/subscription.service.ts`
   - Lines: 293-354 (`getCurrentSubscription`)
   - API: `GET /api/subscription/current`

4. ✅ **Stripe Integration**
   - File: `packages/core-shared/src/services/subscription.service.ts`
   - Lines: 822-902 (`createCheckoutSession`, `openCustomerPortal`)
   - API: `POST /api/stripe/create-checkout`, `POST /api/stripe/portal`

### High Priority (Should Move)
5. **Auth Management**
   - File: `packages/ui/src/services/AuthDataManager.ts`
   - Currently: LocalStorage only
   - API: `POST /api/auth/save`, `GET /api/auth/current`

6. **Notion API Calls** (with quota check)
   - Currently: Direct from frontend
   - API: `POST /api/notion/send-clip`, `POST /api/notion/upload-file`

### Medium Priority (Nice to Have)
7. **Analytics & Logs**
   - Currently: Console logs only
   - API: `POST /api/analytics/event`

---

## 🏗️ Proposed Backend Architecture

### Technology Stack
```
Backend: Node.js + Express (or Fastify)
Database: Supabase (existing)
Hosting: VPS (your server)
Auth: JWT tokens
Rate Limiting: express-rate-limit
Monitoring: Winston + custom middleware
```

### Project Structure
```
notion-clipper-backend/
├── src/
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── quota.routes.ts
│   │   ├── subscription.routes.ts
│   │   ├── stripe.routes.ts
│   │   └── notion.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── quota.controller.ts
│   │   ├── subscription.controller.ts
│   │   ├── stripe.controller.ts
│   │   └── notion.controller.ts
│   ├── services/
│   │   ├── supabase.service.ts
│   │   ├── stripe.service.ts
│   │   ├── notion.service.ts
│   │   └── quota.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── error.middleware.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── validator.ts
│   ├── config/
│   │   └── index.ts
│   └── index.ts
├── .env
├── package.json
└── tsconfig.json
```

---

## 🔌 API Endpoints Specification

### Authentication
```typescript
POST /api/auth/login
  Body: { email, password } | { provider: 'notion'|'google', code }
  Response: { token, userId, email, subscription }

POST /api/auth/refresh
  Headers: { Authorization: 'Bearer <refresh_token>' }
  Response: { token }

GET /api/auth/me
  Headers: { Authorization: 'Bearer <token>' }
  Response: { userId, email, subscription }
```

### Quota Management
```typescript
GET /api/quota/summary
  Headers: { Authorization: 'Bearer <token>' }
  Response: QuotaSummary

POST /api/quota/check
  Headers: { Authorization: 'Bearer <token>' }
  Body: { feature: 'clips'|'files', amount: number }
  Response: { canUse: boolean, remaining: number }

POST /api/quota/track
  Headers: { Authorization: 'Bearer <token>' }
  Body: { feature: string, amount: number }
  Response: { success: boolean }
```

### Subscription
```typescript
GET /api/subscription/current
  Headers: { Authorization: 'Bearer <token>' }
  Response: Subscription

POST /api/subscription/create-checkout
  Headers: { Authorization: 'Bearer <token>' }
  Body: CreateCheckoutPayload
  Response: { sessionId, url }

POST /api/subscription/portal
  Headers: { Authorization: 'Bearer <token>' }
  Body: { returnUrl?: string }
  Response: { url }
```

### Notion (with quota enforcement)
```typescript
POST /api/notion/send-clip
  Headers: { Authorization: 'Bearer <token>' }
  Body: { pageId, content, type }
  Response: { success: boolean, blockId }
  // Server checks quota BEFORE sending to Notion

POST /api/notion/upload-file
  Headers: { Authorization: 'Bearer <token>' }
  Body: { pageId, file: Buffer, fileName }
  Response: { success: boolean, url }
  // Server checks quota BEFORE uploading
```

---

## 🚀 Migration Strategy

### Phase 1: Setup Backend (Week 1)
**Goal**: Basic API infrastructure

**Tasks**:
1. ✅ Create Node.js + Express project
2. ✅ Setup environment variables (.env)
3. ✅ Configure Supabase client (server-side)
4. ✅ Setup JWT authentication
5. ✅ Create base middleware (auth, rate-limit, error)
6. ✅ Setup logging (Winston)

**Deliverable**: Working backend with health check endpoint

### Phase 2: Critical Endpoints (Week 1-2)
**Goal**: Quota + Subscription APIs

**Tasks**:
1. ✅ Implement `/api/quota/summary`
2. ✅ Implement `/api/quota/check`
3. ✅ Implement `/api/quota/track`
4. ✅ Implement `/api/subscription/current`
5. ✅ Implement `/api/auth/login` (JWT issuance)
6. ✅ Test all endpoints with Postman

**Deliverable**: Quota system fully on backend

### Phase 3: Frontend Migration (Week 2)
**Goal**: Replace Supabase calls with API calls

**Tasks**:
1. ✅ Create `api.service.ts` in frontend
2. ✅ Replace `subscriptionService` calls
3. ✅ Replace `usageTrackingService` calls
4. ✅ Update auth flow to use JWT
5. ✅ Remove Supabase client from frontend
6. ✅ Test quota enforcement end-to-end

**Deliverable**: Frontend using backend APIs

### Phase 4: Stripe Integration (Week 2-3)
**Goal**: Secure payment processing

**Tasks**:
1. ✅ Implement `/api/stripe/create-checkout`
2. ✅ Implement `/api/stripe/portal`
3. ✅ Implement `/api/stripe/webhook`
4. ✅ Update frontend to use new endpoints
5. ✅ Test payment flow end-to-end

**Deliverable**: Payments working via backend

### Phase 5: Notion Integration (Week 3)
**Goal**: Secure Notion API with quota checks

**Tasks**:
1. ✅ Implement `/api/notion/send-clip`
2. ✅ Implement `/api/notion/upload-file`
3. ✅ Add quota pre-check before Notion calls
4. ✅ Update frontend to use new endpoints
5. ✅ Test clip sending with quota enforcement

**Deliverable**: All Notion operations via backend

---

## 📝 Implementation Example

### Backend: quota.controller.ts
```typescript
import { Request, Response } from 'express';
import { SupabaseService } from '../services/supabase.service';
import { QuotaService } from '../services/quota.service';

export class QuotaController {
  constructor(
    private supabase: SupabaseService,
    private quota: QuotaService
  ) {}

  async getSummary(req: Request, res: Response) {
    try {
      const userId = req.user.id; // From JWT middleware

      // Get subscription
      const subscription = await this.supabase.getSubscription(userId);

      // Get usage
      const usage = await this.supabase.getUsageRecord(userId);

      // Calculate quotas (server-side)
      const summary = this.quota.calculateSummary(subscription, usage);

      res.json({ success: true, summary });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async track(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const { feature, amount } = req.body;

      // Validate
      if (!feature || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing feature or amount'
        });
      }

      // Increment usage (server-side)
      await this.supabase.incrementUsage(userId, feature, amount);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
```

### Frontend: api.service.ts
```typescript
export class ApiService {
  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string | null>
  ) {}

  async getQuotaSummary(): Promise<QuotaSummary> {
    const token = await this.getToken();

    const response = await fetch(`${this.baseUrl}/api/quota/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.summary;
  }

  async trackUsage(feature: string, amount: number): Promise<void> {
    const token = await this.getToken();

    const response = await fetch(`${this.baseUrl}/api/quota/track`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ feature, amount })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }
}
```

---

## 🔒 Security Improvements

### Before (Current)
```
Frontend → Supabase (direct)
├─ Exposed: supabaseUrl, supabaseKey
├─ RLS: Yes, but can be bypassed
├─ Rate Limiting: None
└─ Monitoring: None
```

### After (VPS Backend)
```
Frontend → Backend API → Supabase
├─ Exposed: Only API URL
├─ Auth: JWT tokens (short-lived)
├─ Rate Limiting: Per-user, per-endpoint
├─ Monitoring: Winston logs + metrics
└─ Secrets: Stored in .env (server-side only)
```

### Rate Limiting Example
```typescript
import rateLimit from 'express-rate-limit';

const quotaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/quota', quotaLimiter);
```

---

## 📊 Migration Checklist

### Backend Setup
- [ ] Create Node.js project
- [ ] Setup environment variables
- [ ] Configure Supabase client
- [ ] Setup JWT authentication
- [ ] Create middleware (auth, rate-limit, error)
- [ ] Setup logging

### API Endpoints
- [ ] POST /api/auth/login
- [ ] GET /api/auth/me
- [ ] GET /api/quota/summary
- [ ] POST /api/quota/check
- [ ] POST /api/quota/track
- [ ] GET /api/subscription/current
- [ ] POST /api/stripe/create-checkout
- [ ] POST /api/stripe/portal
- [ ] POST /api/stripe/webhook
- [ ] POST /api/notion/send-clip
- [ ] POST /api/notion/upload-file

### Frontend Migration
- [ ] Create api.service.ts
- [ ] Replace subscription.service.ts calls
- [ ] Replace usage-tracking.service.ts calls
- [ ] Update auth flow
- [ ] Remove Supabase client
- [ ] Add JWT storage/refresh

### Testing
- [ ] Unit tests (backend)
- [ ] Integration tests (API)
- [ ] E2E tests (frontend → backend)
- [ ] Load testing (rate limits)
- [ ] Security audit

### Deployment
- [ ] Setup VPS server
- [ ] Configure nginx reverse proxy
- [ ] Setup SSL certificates
- [ ] Deploy backend
- [ ] Update frontend config
- [ ] Monitor logs

---

## 🎯 Success Metrics

1. **Security**
   - [ ] No API keys in frontend bundle
   - [ ] All database operations via backend
   - [ ] Rate limiting active

2. **Performance**
   - [ ] API response time < 200ms (p95)
   - [ ] Zero RLS bypass attempts

3. **Reliability**
   - [ ] 99.9% uptime
   - [ ] Graceful error handling
   - [ ] Automatic retries

---

## 🔜 Next Steps (Immediate)

1. **Create backend project**
   ```bash
   mkdir notion-clipper-backend
   cd notion-clipper-backend
   npm init -y
   npm install express @supabase/supabase-js jsonwebtoken dotenv winston
   npm install -D @types/express @types/jsonwebtoken typescript ts-node
   ```

2. **Setup basic server**
   - Create `src/index.ts` with Express app
   - Add health check endpoint
   - Test locally

3. **Implement first endpoint** (`/api/quota/summary`)
   - Create quota.controller.ts
   - Test with Postman
   - Update frontend to use it

---

**Status**: Ready for implementation
**Next Action**: Create backend project structure
**ETA**: 2-3 weeks for full migration

