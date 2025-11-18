# Authentication & Registration Security Audit

**Date**: 2025-11-17
**Severity**: CRITICAL
**Scope**: Complete authentication flow (registration, login, session management)
**Status**: 🔴 Multiple HIGH-severity issues identified

---

## 🎯 Executive Summary

The Notion Clipper application uses a **custom OAuth implementation** instead of Supabase Auth, which introduces several security vulnerabilities and architectural concerns. While some mitigations are in place (encrypted token storage), the overall authentication system has **critical security gaps** that require immediate attention.

### Risk Level: **HIGH**

**Critical Issues**:
- ❌ Workspace ID alone allows auto-reconnect (account hijacking risk)
- ❌ No email verification after OAuth registration
- ❌ Direct Supabase client in frontend (API keys exposed)
- ❌ Edge Functions bypass RLS with service role key
- ❌ Encryption keys stored in environment variables (extraction risk)

---

## 📋 Authentication Flow Analysis

### Current Implementation

```
User Registration Flow:
1. User clicks "Connect with Notion" → OAuth popup opens
2. Notion OAuth returns: code + workspace_id
3. Frontend calls Edge Function create-user with workspace_id as userId
4. Edge Function creates user_profiles record (bypasses RLS with service_role_key)
5. Notion token encrypted and stored in notion_connections table
6. User logged in → session persisted to:
   - Electron Config (encrypted via safeStorage)
   - localStorage (user_id, email, workspace, but NOT token)
   - Supabase (user_profiles + notion_connections)

User Login Flow:
1. App checks Electron Config for userId
2. If found → calls get-notion-token Edge Function
3. Edge Function bypasses RLS, decrypts token server-side
4. User auto-logged in without re-authentication
```

### Architecture Decision: Custom OAuth vs Supabase Auth

**Current**: Custom OAuth implementation
**Standard**: Supabase Auth with OAuth providers

**Why Custom?**
- Uses Notion workspace_id as primary identifier
- Avoids Supabase Auth limitations (email requirement)
- Direct control over user creation and token management

**Consequences**:
- ⚠️ No built-in session management
- ⚠️ No PKCE protection
- ⚠️ No automatic token rotation
- ⚠️ No MFA support
- ⚠️ Manual RLS bypass required (service role key)

---

## 🔴 CRITICAL Security Issues

### 1. AUTO-RECONNECT WITH WORKSPACE ID ONLY

**Severity**: 🔴 **HIGH (Account Hijacking)**

**Location**: `AuthDataManager.loadAuthData()` lines 156-186

**Problem**:
```typescript
// User can reconnect with ONLY workspace_id stored in Electron config
const electronData = await this.loadFromElectronConfig();
if (electronData) {
  console.log('[AuthDataManager] ✅ Loaded from Electron config');

  // 🔐 Loads Notion token from database using ONLY userId (workspace_id)
  const notionConnection = await this.loadNotionConnection(electronData.userId);

  // User is now logged in - NO password, NO OAuth re-verification
  this.currentData = electronData;
  return electronData;
}
```

**Attack Vector**:
1. Attacker gains access to victim's computer
2. Reads Electron config from `~/.config/notion-clipper/config.json`
3. Extracts `workspace_id`
4. Installs Notion Clipper on their own computer
5. Manually sets `workspace_id` in their Electron config
6. Opens app → **LOGGED IN as victim** (full access to victim's Notion)

**Risk**:
- ✅ Notion token is encrypted (requires encryption key to decrypt)
- ❌ But encryption key is in `.env` file (can be extracted from app bundle)
- ❌ Workspace ID is plaintext in config file
- ❌ No second factor authentication
- ❌ No device fingerprinting
- ❌ No suspicious login detection

**Recommendation**:
```typescript
// OPTION A: Require OAuth re-authentication after X days
const REAUTH_REQUIRED_DAYS = 30;
const lastAuth = await electronAPI.invoke('config:get', 'lastAuthTimestamp');
const daysSinceAuth = (Date.now() - lastAuth) / (1000 * 60 * 60 * 24);

if (daysSinceAuth > REAUTH_REQUIRED_DAYS) {
  console.warn('[Auth] Re-authentication required (30+ days)');
  return null; // Force OAuth flow
}

// OPTION B: Add device fingerprint check
const deviceId = await getDeviceFingerprint(); // Machine ID, CPU serial, etc.
const storedDeviceId = await electronAPI.invoke('config:get', 'deviceId');

if (deviceId !== storedDeviceId) {
  console.error('[Auth] Device mismatch detected - potential account hijacking');
  await clearAuthData(); // Force re-auth
  return null;
}

// OPTION C: Require periodic "Check I'm still authorized" with Notion API
const verifyResult = await fetch('https://api.notion.com/v1/users/me', {
  headers: { 'Authorization': `Bearer ${notionToken}` }
});

if (!verifyResult.ok) {
  console.error('[Auth] Notion token invalid - clearing session');
  await clearAuthData();
  return null;
}
```

---

### 2. NO EMAIL VERIFICATION AFTER OAUTH

**Severity**: 🔴 **MEDIUM-HIGH (Account Security)**

**Location**: `AuthDataManager.saveToSupabase()` lines 719-791

**Problem**:
```typescript
// After OAuth, user profile is created WITHOUT email verification
const response = await fetch(`${this.supabaseUrl}/functions/v1/create-user`, {
  method: 'POST',
  body: JSON.stringify({
    userId: data.userId,         // workspace_id
    email: data.email,           // ❌ Not verified!
    fullName: data.fullName,
    authProvider: data.authProvider
  })
});

// User is immediately logged in - NO email confirmation required
```

**Risk**:
- OAuth providers (Notion, Google) return email addresses
- But these emails are **not verified by the application**
- User could change their Notion/Google email after signup
- Application has **no way to contact the user** reliably
- Password reset, billing, security alerts → **LOST**

**Attack Scenario**:
1. Attacker creates Notion account with victim's email (victim@company.com)
2. Signs up for Notion Clipper with that Notion account
3. Changes Notion email to attacker@evil.com
4. Victim tries to sign up → "Email already taken"
5. Victim cannot reset password (no password-based auth)
6. Attacker retains full access

**Recommendation**:
```typescript
// After OAuth signup, send verification email
async function sendEmailVerification(userId: string, email: string) {
  // Generate verification token
  const verificationToken = crypto.randomUUID();

  // Store in database with expiry
  await supabase.from('email_verifications').insert({
    user_id: userId,
    email,
    token: verificationToken,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
  });

  // Send email
  await sendEmail({
    to: email,
    subject: 'Verify your Notion Clipper email',
    body: `Click here to verify: https://app.notion-clipper.com/verify?token=${verificationToken}`
  });
}

// Mark account as "email_unverified" until clicked
await supabase.from('user_profiles').update({
  email_verified: false,
  verification_sent_at: new Date()
}).eq('id', userId);

// Restrict features until verified
if (!user.email_verified) {
  showBanner('Please verify your email to access premium features');
  disableBilling(); // Cannot subscribe until verified
}
```

---

### 3. SUPABASE CREDENTIALS EXPOSED IN FRONTEND

**Severity**: 🔴 **CRITICAL (API Key Leakage)**

**Location**:
- `App.tsx` lines 196-197
- `AuthDataManager.ts` lines 84-91, 238-256

**Problem**:
```typescript
// App.tsx - Supabase credentials HARDCODED in frontend bundle
const supabaseUrl = 'https://your-project.supabase.co';  // ❌ EXPOSED
const supabaseKey = 'your-anon-key-here';                // ❌ EXPOSED

const supabase = createClient(supabaseUrl, supabaseKey);

// AuthDataManager.ts - Keys passed around in memory
initialize(supabaseClient, supabaseUrl, supabaseKey) {
  this.supabaseUrl = supabaseUrl;  // ❌ Stored in memory
  this.supabaseKey = supabaseKey;  // ❌ Can be extracted
}

// Used to call Edge Functions directly from frontend
const result = await fetch(`${this.supabaseUrl}/functions/v1/get-notion-token`, {
  headers: {
    'apikey': this.supabaseKey,              // ❌ EXPOSED
    'Authorization': `Bearer ${this.supabaseKey}`
  }
});
```

**Risk**:
- Supabase anon key is **extractable from app.asar** (Electron bundle)
- Attacker can:
  - Call Edge Functions directly
  - Query database (limited by RLS, but still risky)
  - Enumerate users
  - Attempt RLS bypass attacks
  - Spam Edge Functions (DoS attack)

**Current Mitigation**:
- Row Level Security (RLS) policies prevent unauthorized access
- Edge Functions use service role key internally (not exposed)

**Remaining Risk**:
- Anon key is still **rate-limit bypass** risk
- Edge Functions can be called by anyone with the anon key
- **No authentication required** to call some Edge Functions

**Recommendation**:
✅ **Migrate to backend API** (already planned in BACKEND_MIGRATION_PLAN.md)

```typescript
// BEFORE (current - insecure):
const result = await fetch(`${supabaseUrl}/functions/v1/get-notion-token`, {
  headers: {
    'apikey': supabaseKey,  // ❌ Exposed
    'Authorization': `Bearer ${supabaseKey}`
  }
});

// AFTER (backend API - secure):
const result = await fetch('https://api.notion-clipper.com/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`  // ✅ Short-lived JWT
  }
});
```

---

### 4. EDGE FUNCTIONS BYPASS RLS WITH SERVICE ROLE KEY

**Severity**: 🔴 **HIGH (Privilege Escalation)**

**Location**:
- `AuthDataManager.loadNotionConnection()` lines 402-458
- `AuthDataManager.saveNotionConnection()` lines 228-283

**Problem**:
```typescript
// Edge Functions use SERVICE_ROLE_KEY to bypass Row Level Security
// This is necessary because custom OAuth users don't have Supabase Auth sessions
//
// get-notion-token.ts (Edge Function):
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

// Bypasses RLS completely
const { data } = await supabase
  .from('notion_connections')
  .select('*')
  .eq('user_id', userId)  // ❌ Only checks userId - no auth verification
  .maybeSingle();
```

**Risk**:
- Edge Functions trust `userId` parameter **without verification**
- Attacker can call Edge Function with ANY `userId` to get their tokens:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/get-notion-token \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key" \
  -d '{"userId": "victim-workspace-id"}'

# Response: { "success": true, "token": "victim_notion_token_decrypted", ... }
# ❌ CRITICAL: Attacker now has victim's Notion token!
```

**Current Mitigation**:
- Edge Functions require `apikey` header (but this is exposed in frontend)
- Service role key is **NOT** exposed (only used server-side in Edge Functions)

**Remaining Vulnerability**:
- Anyone with anon key can enumerate userIds
- No rate limiting on Edge Functions
- No audit logging of suspicious requests

**Recommendation**:
```typescript
// CRITICAL FIX: Add authentication layer to Edge Functions
//
// Option 1: Require JWT token signed by backend
const authHeader = req.headers.get('authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401
  });
}

const jwtToken = authHeader.substring(7);
const { userId: authenticatedUserId } = verifyJWT(jwtToken, JWT_SECRET);

// Only allow user to access their own data
if (userId !== authenticatedUserId) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403
  });
}

// Option 2: Use Supabase Auth RLS (migrate from custom OAuth)
const { data: { user }, error } = await supabase.auth.getUser(req.headers.get('authorization'));
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

// RLS now enforces user can only access their own rows
const { data } = await supabase
  .from('notion_connections')
  .select('*')
  .eq('user_id', user.id)  // ✅ RLS enforces this automatically
  .maybeSingle();
```

---

### 5. ENCRYPTION KEY IN ENVIRONMENT VARIABLES

**Severity**: 🟡 **MEDIUM (Key Extraction)**

**Location**: `AuthDataManager.decryptNotionToken()` lines 299-393

**Problem**:
```typescript
// Encryption key is loaded from environment variables
let encryptionKeyBase64: string | undefined;

if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TOKEN_ENCRYPTION_KEY) {
  encryptionKeyBase64 = (import.meta as any).env.VITE_TOKEN_ENCRYPTION_KEY;  // ❌ In .env file
}

// In Electron, .env is bundled in app.asar
// Attacker can:
// 1. Extract app.asar with: npx asar extract app.asar extracted/
// 2. Find TOKEN_ENCRYPTION_KEY in extracted files
// 3. Decrypt all Notion tokens in database
```

**Risk**:
- Encryption key is **extractable from app bundle**
- If attacker gets key + database access → **all tokens decrypted**
- Key is shared across all users (not per-user keys)

**Current Mitigation**:
- Tokens are encrypted at rest (better than plaintext)
- Database requires authentication to access
- Edge Functions decrypt server-side (client never sees encrypted tokens directly)

**Remaining Risk**:
- Static key (never rotated)
- Same key for all users
- Extractable from distributed app

**Recommendation**:
```typescript
// OPTION A: Use hardware-backed encryption (Electron safeStorage)
// Already implemented for Electron config - extend to Notion tokens
const encryptedToken = safeStorage.encryptString(notionToken);

// OPTION B: Use per-user encryption keys
// Derive encryption key from user's password (if using password auth)
const userKey = await pbkdf2(userPassword, userId, 100000, 32, 'sha256');
const encryptedToken = await encrypt(notionToken, userKey);

// OPTION C: Use backend encryption (recommended for VPS migration)
// Encrypt tokens on backend with rotating keys stored in HSM/Vault
POST /api/notion/save-token
Body: { "token": "secret_xxx" }  // Sent encrypted via HTTPS
// Backend encrypts with: AWS KMS, HashiCorp Vault, or similar
```

---

### 6. NO RATE LIMITING ON AUTHENTICATION

**Severity**: 🟡 **MEDIUM (Brute Force / DoS)**

**Location**: All authentication endpoints

**Problem**:
- No rate limiting on OAuth callbacks
- No rate limiting on Edge Function calls
- No CAPTCHA on suspicious activity
- No IP-based throttling

**Attack Vectors**:
```bash
# Brute force userId enumeration
for userId in $(seq 1000000 2000000); do
  curl -X POST .../get-notion-token \
    -d "{\"userId\": \"$userId\"}" &
done

# DoS attack on Edge Functions
while true; do
  curl -X POST .../create-user \
    -d '{"userId": "random", ...}' &
done
```

**Recommendation**:
```typescript
// Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later'
});

app.post('/api/auth/login', authLimiter, authController.login);

// Add CAPTCHA for suspicious patterns
if (failedAttempts > 3) {
  requireCaptcha = true;
}

// Add device fingerprinting
const deviceId = await getDeviceFingerprint();
if (seenDevices.get(deviceId) > 10) {
  blockDevice(deviceId, '24h');
}
```

---

## 🟡 Medium-Priority Issues

### 7. SESSION MANAGEMENT GAPS

**Issue**: No centralized session management
**Impact**: Cannot revoke sessions, no "logout everywhere" feature

**Recommendation**:
```typescript
// Add sessions table
create table user_sessions (
  id uuid primary key,
  user_id text references user_profiles(id),
  device_id text,
  device_name text,
  created_at timestamptz default now(),
  last_active_at timestamptz default now(),
  expires_at timestamptz,
  revoked boolean default false
);

// Track active sessions
POST /api/auth/sessions/create
GET /api/auth/sessions/list
DELETE /api/auth/sessions/:id/revoke
DELETE /api/auth/sessions/revoke-all
```

---

### 8. NO AUDIT LOGGING

**Issue**: No logs of authentication events
**Impact**: Cannot detect suspicious activity, no forensics

**Recommendation**:
```typescript
// Add audit_logs table
create table audit_logs (
  id uuid primary key,
  user_id text,
  event_type text,  -- 'login', 'logout', 'token_refresh', 'suspicious_ip'
  ip_address inet,
  user_agent text,
  device_id text,
  success boolean,
  metadata jsonb,
  created_at timestamptz default now()
);

// Log all auth events
await auditLog({
  userId,
  eventType: 'login',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  success: true
});

// Alert on suspicious patterns
if (loginFromNewCountry || loginFromNewDevice) {
  sendSecurityAlert(user.email);
}
```

---

### 9. NOTION TOKEN NEVER REFRESHED

**Issue**: Notion tokens are long-lived, never rotated
**Impact**: Stolen token remains valid indefinitely

**Recommendation**:
```typescript
// Periodically check if Notion token still valid
async function validateNotionToken(token: string) {
  const response = await fetch('https://api.notion.com/v1/users/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    // Token invalid - force re-authentication
    await clearAuthData();
    throw new Error('Notion token expired - please reconnect');
  }
}

// Run validation on app startup
await validateNotionToken(currentUser.notionToken);

// Prompt user to refresh token every 90 days
const TOKEN_REFRESH_DAYS = 90;
if (daysSinceLastRefresh > TOKEN_REFRESH_DAYS) {
  showModal('Please reconnect your Notion account for security');
}
```

---

## 🟢 Good Security Practices (Already Implemented)

### ✅ 1. Notion Tokens Encrypted at Rest
- Tokens encrypted with AES-256-GCM before storage
- Edge Function decrypts server-side (client never sees encrypted form)
- Located: `AuthDataManager.decryptNotionToken()` lines 299-393

### ✅ 2. Tokens NOT Stored in localStorage (Plaintext)
- Removed plaintext token storage (line 605-611 comments)
- Electron: Uses safeStorage encryption
- Database: Encrypted via Edge Function

### ✅ 3. Row Level Security (RLS) Policies
- Database tables have RLS enabled
- Prevents direct unauthorized access

### ✅ 4. Input Validation
- Edge Functions validate input parameters
- TypeScript types enforce data structure

### ✅ 5. Secure Communication
- HTTPS for all Edge Function calls
- TLS for Supabase connections

---

## 📊 Risk Summary

| Issue | Severity | Exploitability | Impact | Mitigation Status |
|-------|----------|----------------|--------|-------------------|
| Auto-reconnect with workspace ID only | 🔴 HIGH | Easy | Account hijacking | ⏳ Planned |
| No email verification | 🔴 MEDIUM-HIGH | Medium | Account takeover | ❌ Not addressed |
| Supabase credentials in frontend | 🔴 CRITICAL | Easy | API abuse | ✅ Migration planned |
| Edge Functions bypass RLS | 🔴 HIGH | Medium | Data access | ⏳ Planned (backend migration) |
| Encryption key in env | 🟡 MEDIUM | Hard | Token decryption | ⏳ Planned (backend KMS) |
| No rate limiting | 🟡 MEDIUM | Easy | Brute force / DoS | ⏳ Planned (backend) |
| No session management | 🟡 MEDIUM | N/A | Cannot revoke sessions | ❌ Not addressed |
| No audit logging | 🟡 MEDIUM | N/A | No forensics | ❌ Not addressed |
| Notion token never refreshed | 🟡 MEDIUM | Medium | Stolen token persistence | ❌ Not addressed |

---

## 🚀 Recommended Actions (Priority Order)

### Immediate (Week 1)

1. **✅ Migrate to backend API** (already in progress)
   - Removes Supabase credentials from frontend
   - Adds JWT-based authentication
   - Implements rate limiting
   - Centralizes security controls

2. **Add device fingerprinting** to auto-reconnect flow
   ```typescript
   const deviceId = await getDeviceFingerprint();
   if (storedDeviceId !== deviceId) {
     requireReAuthentication();
   }
   ```

3. **Require periodic OAuth re-verification** (every 30 days)
   ```typescript
   if (daysSinceLastAuth > 30) {
     showReAuthModal();
   }
   ```

### Short-term (Week 2-3)

4. **Add email verification flow**
   - Send verification email after OAuth signup
   - Restrict premium features until verified
   - Add email change workflow with verification

5. **Implement session management**
   - Track active sessions in database
   - Add "View Active Sessions" page
   - Add "Logout Everywhere" button

6. **Add audit logging**
   - Log all authentication events
   - Alert on suspicious patterns
   - Monthly security summary email

### Medium-term (Month 1-2)

7. **Migrate from custom OAuth to Supabase Auth**
   - Enables built-in session management
   - Automatic token rotation
   - MFA support
   - Better security defaults

8. **Implement token refresh mechanism**
   - Periodic Notion API validation
   - Prompt user to reconnect if expired
   - Graceful degradation

9. **Add security monitoring**
   - Anomaly detection (new country, new device)
   - Failed login attempts tracking
   - Suspicious activity alerts

### Long-term (Month 2+)

10. **Add MFA support**
    - TOTP (Google Authenticator)
    - SMS backup codes
    - Recovery codes

11. **Implement key rotation**
    - Rotate encryption keys quarterly
    - Re-encrypt all tokens with new key
    - Store keys in HSM/Vault

12. **Add security audit trail**
    - Compliance logging (GDPR, SOC 2)
    - Tamper-proof audit logs
    - Export for security reviews

---

## 🔐 Backend Migration Security Improvements

The planned backend migration (see `BACKEND_MIGRATION_PLAN.md`) will address many of these issues:

### ✅ Improvements from Backend Migration

1. **JWT-based authentication** replaces custom OAuth
   - Short-lived access tokens (24h)
   - Refresh tokens (7d)
   - Automatic token rotation

2. **All business logic server-side**
   - No Supabase credentials in frontend
   - No service role key bypass needed
   - Proper authentication checks

3. **Rate limiting** on all endpoints
   - Per-user limits
   - Per-IP limits
   - CAPTCHA on suspicious activity

4. **Centralized session management**
   - Track active sessions
   - Revoke sessions remotely
   - Device management

5. **Audit logging** built-in
   - All API calls logged
   - Winston logger with rotation
   - Export for compliance

### Remaining Gaps (Not Solved by Backend Migration)

- Email verification (still needs implementation)
- Device fingerprinting (still needs implementation)
- Notion token refresh (still needs implementation)
- MFA (future enhancement)

---

## 📝 Testing & Validation

### Security Test Plan

```bash
# 1. Test auto-reconnect without re-auth
- Copy Electron config to new machine
- Open app → Should prompt for re-auth after 30 days

# 2. Test Edge Function authentication
curl -X POST .../get-notion-token \
  -d '{"userId": "other-user-id"}' \
  # Should return 403 Forbidden (not their userId)

# 3. Test rate limiting
for i in {1..100}; do
  curl -X POST .../auth/login &
done
# Should hit rate limit after 5 requests

# 4. Test token encryption
- Extract app.asar
- Search for VITE_TOKEN_ENCRYPTION_KEY
- Should NOT be in bundle (use Vault instead)

# 5. Test email verification
- Sign up with OAuth
- Try to access premium features
- Should be blocked until email verified

# 6. Test session revocation
- Login on 2 devices
- Revoke session on device 1
- Device 2 should be logged out
```

---

## 📚 References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Supabase Auth Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)
- [Notion API Security](https://developers.notion.com/reference/authentication)

---

**Status**: 🔴 Critical issues identified - Backend migration in progress
**Next Review**: After backend migration completion
**Owner**: Security Team

**Related Documents**:
- `BACKEND_MIGRATION_PLAN.md` - Backend architecture
- `BACKEND_API_MIGRATION_GUIDE.md` - Migration steps
- `SECURITY_AUDIT_REPORT.md` - Quota enforcement audit
