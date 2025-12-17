# Clipper Pro Backend API

Secure backend API for Clipper Pro - Handles quota enforcement, subscription management, and Stripe integration.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run Development Server
```bash
npm run dev
```

Server will start on `http://localhost:3001`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration (env vars)
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, rate limiting, etc.
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Logger, helpers
│   └── index.ts         # App entry point
├── logs/                # Application logs
├── .env                 # Environment variables
└── package.json
```

## 🔌 API Endpoints

### Health Check
```
GET /health
Response: { status: 'ok', timestamp, uptime }
```

### Authentication
```
POST /api/auth/login
Body: {
  provider: 'notion'|'google',
  code: 'oauth_code',
  workspace_id: 'user_workspace_id',
  email?: 'user@example.com'
}
Response: { success, token, refreshToken, userId, email, subscription }

POST /api/auth/refresh
Headers: Authorization: Bearer <refresh_token>
Response: { success, token }

GET /api/auth/me
Headers: Authorization: Bearer <access_token>
Response: { success, user: { id, email, subscription } }
```

### Quota Management
```
GET /api/quota/summary
Headers: Authorization: Bearer <token>
Response: { success, summary }

POST /api/quota/check
Headers: Authorization: Bearer <token>
Body: { feature: 'clips'|'files', amount: 1 }
Response: { success, canUse, remaining }

POST /api/quota/track
Headers: Authorization: Bearer <token>
Body: { feature: string, amount: number }
Response: { success }
```

### Subscription Management
```
GET /api/subscription/current
Headers: Authorization: Bearer <token>
Response: { success, subscription }

POST /api/subscription/create-checkout
Headers: Authorization: Bearer <token>
Body: {
  priceId: 'price_xxx',
  successUrl: 'https://...',
  cancelUrl: 'https://...',
  billingCycle?: 'monthly'|'yearly'
}
Response: { success, sessionId, url }

POST /api/subscription/portal
Headers: Authorization: Bearer <token>
Body: { returnUrl: 'https://...' }
Response: { success, url }
```

### Stripe Webhooks
```
POST /api/stripe/webhook
Headers: stripe-signature: <signature>
Body: <raw stripe event>
Response: { success, received }

Supported events:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

### Notion Proxy (with Quota Enforcement)
```
POST /api/notion/send-clip
Headers: Authorization: Bearer <token>
Body: {
  pageId: 'notion_page_id',
  content: { ...notion block... },
  type: 'paragraph',
  notionToken: 'user_notion_token'
}
Response: { success, blockId }

POST /api/notion/upload-file
Headers: Authorization: Bearer <token>
Body: {
  pageId: 'notion_page_id',
  fileUrl: 'https://...',
  fileName: 'file.png',
  notionToken: 'user_notion_token'
}
Response: { success, blockId, url }

POST /api/notion/batch-send
Headers: Authorization: Bearer <token>
Body: {
  pageId: 'notion_page_id',
  items: [
    { type: 'clip', content: {...} },
    { type: 'file', content: {...} }
  ],
  notionToken: 'user_notion_token'
}
Response: { success, clipsSent, filesSent }
```

## 🔒 Security Features

- ✅ JWT authentication
- ✅ Rate limiting (100 req/15min)
- ✅ Helmet security headers
- ✅ CORS protection
- ✅ Input validation
- ✅ Secure error handling

## 📊 Monitoring

Logs are written to:
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs

## 🚢 Production Deployment

### 1. Build
```bash
npm run build
```

### 2. Start
```bash
NODE_ENV=production npm start
```

### 3. Use PM2 (Recommended)
```bash
npm install -g pm2
pm2 start dist/index.js --name notion-clipper-api
pm2 save
pm2 startup
```

## 🔧 Environment Variables

See `.env.example` for all required variables.

Critical variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Service role key (NOT anon key)
- `JWT_SECRET` - Secret for signing JWTs
- `STRIPE_SECRET_KEY` - Stripe API key (if using payments)

## 📝 Development

### Run Tests
```bash
npm test
```

### Lint
```bash
npm run lint
```

### Watch Mode
```bash
npm run dev
```

## 🐛 Troubleshooting

### "Missing required environment variable"
- Check that all variables in `.env.example` are set in `.env`

### "Error connecting to Supabase"
- Verify `SUPABASE_URL` and `SUPABASE_KEY`
- Ensure you're using the **service role key**, not anon key

### "Token expired"
- JWT tokens expire after 24h by default
- Frontend needs to refresh tokens or re-authenticate

## 📚 Implementation Status

1. ✅ Auth endpoints (`/api/auth/login`, `/api/auth/refresh`, `/api/auth/me`)
2. ✅ Quota endpoints (`/api/quota/summary`, `/api/quota/check`, `/api/quota/track`)
3. ✅ Subscription endpoints (`/api/subscription/current`, `/api/subscription/create-checkout`, `/api/subscription/portal`)
4. ✅ Stripe webhook handler (`/api/stripe/webhook`)
5. ✅ Notion proxy endpoints (`/api/notion/send-clip`, `/api/notion/upload-file`, `/api/notion/batch-send`)
6. ⏳ Frontend migration (see `BACKEND_API_MIGRATION_GUIDE.md`)
7. ⏳ Add comprehensive tests
8. ⏳ Set up CI/CD pipeline

## 📖 Documentation

- **Migration Guide**: See `BACKEND_API_MIGRATION_GUIDE.md` for step-by-step instructions
- **Security Audit**: See `SECURITY_AUDIT_REPORT.md` for vulnerability fixes
- **Architecture Plan**: See `BACKEND_MIGRATION_PLAN.md` for overall strategy

---

**Status**: 🟢 Backend Complete - Ready for Frontend Migration
**Version**: 1.0.0
**Last Updated**: 2025-11-17
