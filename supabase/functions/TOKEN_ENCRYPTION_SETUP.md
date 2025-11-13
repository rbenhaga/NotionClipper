# Token Encryption Setup

## Overview

Notion access tokens are now encrypted both in Electron (using `safeStorage`) and in the Supabase database (using AES-GCM encryption).

## Prerequisites

- Supabase CLI installed
- Access to Supabase project dashboard

## Setup Instructions

### 1. Generate Encryption Key

Generate a secure 32-byte (256-bit) encryption key:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Python
python3 -c "import os, base64; print(base64.b64encode(os.urandom(32)).decode())"
```

**⚠️ IMPORTANT:** Save this key securely! If you lose it, you won't be able to decrypt existing tokens.

### 2. Add to Supabase Vault (Recommended)

```bash
# Set secret in Supabase Vault
supabase secrets set TOKEN_ENCRYPTION_KEY="your_base64_key_here"

# Verify it was set
supabase secrets list
```

### 3. Add to Local .env (Development Only)

For local development and client-side decryption, add to `.env`:

```env
# Server-side (Edge Functions)
TOKEN_ENCRYPTION_KEY=your_base64_key_here

# Client-side (Browser/Electron app)
VITE_TOKEN_ENCRYPTION_KEY=your_base64_key_here
```

**⚠️ IMPORTANT:**
- Both keys MUST be identical (same base64 string)
- `TOKEN_ENCRYPTION_KEY` is used by Edge Functions (server-side)
- `VITE_TOKEN_ENCRYPTION_KEY` is used by the client app (AuthDataManager)
- **NEVER commit the .env file to git!**

### 4. Deploy Edge Functions

Deploy the Edge Functions that use encryption:

```bash
# Deploy save-notion-connection
supabase functions deploy save-notion-connection

# Deploy get-notion-token
supabase functions deploy get-notion-token
```

## Security Considerations

### Electron (Desktop App)
- Tokens are encrypted using `Electron.safeStorage`
- Uses OS-level encryption:
  - **macOS**: Keychain
  - **Windows**: DPAPI
  - **Linux**: libsecret / kwallet
- No configuration needed - handled automatically

### localStorage (Browser/Web UI)
- ✅ **FIXED**: Tokens are NO LONGER stored in localStorage
- Previously stored in plaintext (security risk)
- Now only stored in memory or Electron's secure storage

### Supabase Database
- Tokens encrypted with AES-GCM before storage
- Encryption key stored in Supabase Vault
- Decryption happens in two places:
  - **Client-side**: `AuthDataManager.decryptNotionToken()` for fast app initialization
  - **Server-side**: `get-notion-token` Edge Function as fallback/alternative
- Column name: `notion_connections.access_token_encrypted` (now actually encrypted!)

## Migration Guide

### For Existing Users with Plaintext Tokens

If you have existing tokens in the database from before this fix:

1. **Option A: Re-authenticate** (Recommended)
   - Users should disconnect and reconnect their Notion workspaces
   - New tokens will be encrypted automatically

2. **Option B: Migration Script** (Advanced)
   ```sql
   -- This would need to be run from an Edge Function with the encryption key
   -- Not recommended to run directly in SQL as it would expose the encryption key
   ```

### Updating Client Code

If your code directly accesses tokens from `notion_connections`:

**Before (BROKEN):**
```typescript
const { data } = await supabase
  .from('notion_connections')
  .select('access_token_encrypted')
  .single();

const token = data.access_token_encrypted; // ❌ Returns encrypted gibberish!
```

**After - Option 1: Use AuthDataManager (Recommended)**
```typescript
import { authDataManager } from '@/services/AuthDataManager';

// This now automatically decrypts tokens client-side
const connection = await authDataManager.loadNotionConnection(userId);
const token = connection?.accessToken; // ✅ Decrypted automatically

// Or load all auth data (includes decrypted token)
const authData = await authDataManager.loadAuthData(true);
const token = authData?.notionToken; // ✅ Decrypted automatically
```

**After - Option 2: Use Edge Function**
```typescript
// Alternative: Use Edge Function for server-side decryption
const { data } = await supabase.functions.invoke('get-notion-token', {
  body: { userId }
});

const token = data.token; // ✅ Decrypted server-side
```

**Which approach to use:**
- ✅ **Option 1 (AuthDataManager)**: Faster, no network call, recommended for app initialization
- ✅ **Option 2 (Edge Function)**: More secure (key stays server-side), good for sensitive operations

## Troubleshooting

### "Decryption failed" error
- Check that `TOKEN_ENCRYPTION_KEY` is set correctly
- Verify the key is the same one used for encryption
- Ensure the encrypted data hasn't been corrupted

### "ENCRYPTION_KEY is not defined" or "TOKEN_ENCRYPTION_KEY not available" error

**Server-side (Edge Functions):**
- Run `supabase secrets set TOKEN_ENCRYPTION_KEY="your_key"`
- Redeploy Edge Functions after setting the secret

**Client-side (Browser/Electron):**
- Add `VITE_TOKEN_ENCRYPTION_KEY` to your `.env` file
- Must be the SAME key as `TOKEN_ENCRYPTION_KEY` in Supabase Vault
- Restart the dev server after adding

**Quick fix:**
```bash
# 1. Generate a key
KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# 2. Set in Supabase
supabase secrets set TOKEN_ENCRYPTION_KEY="$KEY"

# 3. Add to .env
echo "VITE_TOKEN_ENCRYPTION_KEY=$KEY" >> .env

# 4. Redeploy functions
supabase functions deploy save-notion-connection
supabase functions deploy get-notion-token
```

### Existing tokens not working
- Old plaintext tokens will fail decryption
- Users need to re-authenticate their Notion connection
- Tokens will be re-encrypted automatically on next auth

## Testing

Test encryption/decryption:

```bash
# Test save-notion-connection (encryption)
curl -X POST https://your-project.supabase.co/functions/v1/save-notion-connection \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "userId": "test-user-id",
    "workspaceId": "test-workspace",
    "workspaceName": "Test Workspace",
    "accessToken": "secret_test_token",
    "isActive": true
  }'

# Test get-notion-token (decryption)
curl -X POST https://your-project.supabase.co/functions/v1/get-notion-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"userId": "test-user-id"}'
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Token Storage                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐        ┌──────────────┐      ┌─────────────┐ │
│  │   Electron   │        │ localStorage │      │  Supabase   │ │
│  │ ConfigService│        │              │      │   Database  │ │
│  ├──────────────┤        ├──────────────┤      ├─────────────┤ │
│  │              │        │              │      │             │ │
│  │  Encrypted   │        │  REMOVED     │      │  Encrypted  │ │
│  │  (safeStorage)│        │  (security   │      │  (AES-GCM)  │ │
│  │              │        │   risk)      │      │             │ │
│  │  ✅ SECURE   │        │  ✅ FIXED    │      │  ✅ SECURE  │ │
│  └──────────────┘        └──────────────┘      └─────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## References

- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Supabase Vault](https://supabase.com/docs/guides/functions/secrets)
- [AES-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
