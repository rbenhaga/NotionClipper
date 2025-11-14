# 🏗️ Architecture Optimale - NotionClipper Production

**Date:** 2025-11-14
**Objectif:** Site vitrine + Panel utilisateur + OAuth + Stripe
**Budget:** 0€/mois (100% gratuit)

---

## 📊 Stack Technique Complète

### Infrastructure

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: CDN & Protection (Cloudflare Free)       │
│  • DDoS protection (plusieurs Tbps)                │
│  • CDN mondial (200+ datacenters)                  │
│  • WAF gratuit (Web Application Firewall)          │
│  • SSL/TLS automatique                             │
│  • Rate limiting (5 règles gratuites)              │
│  • Analytics basiques                              │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Layer 2: Compute (Oracle Cloud Free Tier)         │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ VM.Standard.A1.Flex (ARM Ampere)            │  │
│  │ • 4 vCPU                                    │  │
│  │ • 24 GB RAM                                 │  │
│  │ • 200 GB Block Storage                      │  │
│  │ • 10 TB bandwidth/mois                      │  │
│  │ • Ubuntu 22.04 LTS (aarch64)                │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Caddy 2.x (Reverse Proxy)                   │  │
│  │ • Auto-HTTPS (Let's Encrypt)                │  │
│  │ • Rate limiting (1000 req/min)              │  │
│  │ • Compression (gzip + brotli)               │  │
│  │ • Security headers                          │  │
│  └─────────────────────────────────────────────┘  │
│           ↓                          ↓             │
│  ┌──────────────────┐      ┌──────────────────┐  │
│  │ Site Vitrine     │      │ Backend (opt.)   │  │
│  │ (Static SPA)     │      │ Node.js 20 LTS   │  │
│  │ • React/Vue      │      │ • Express.js     │  │
│  │ • Vite build     │      │ • PM2 cluster    │  │
│  │ • /              │      │ • 4 workers      │  │
│  │ • /dashboard     │      │ • /api/*         │  │
│  └──────────────────┘      └──────────────────┘  │
│                                    ↓               │
│                          ┌──────────────────┐     │
│                          │ Redis 7.x        │     │
│                          │ • Sessions       │     │
│                          │ • Rate limiting  │     │
│                          │ • Cache API      │     │
│                          └──────────────────┘     │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Layer 3: Backend Services (Supabase Free Tier)    │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Supabase Auth                                │  │
│  │ • Google OAuth                               │  │
│  │ • Notion OAuth                               │  │
│  │ • JWT tokens                                 │  │
│  │ • Row Level Security (RLS)                   │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ PostgreSQL 15                                │  │
│  │ • user_profiles                              │  │
│  │ • notion_connections (tokens chiffrés)      │  │
│  │ • subscriptions                              │  │
│  │ • usage_tracking                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Edge Functions (Deno)                        │  │
│  │ • /notion-oauth (callback)                   │  │
│  │ • /google-oauth (callback)                   │  │
│  │ • /create-checkout (Stripe)                  │  │
│  │ • /webhook-stripe                            │  │
│  │ • /get-subscription                          │  │
│  │ • /save-notion-connection                    │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Layer 4: External APIs                             │
│  • Notion API (pages, databases)                   │
│  • Stripe API (subscriptions, billing)             │
│  • Google APIs (user info)                         │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Séparation des Responsabilités

### Ce qui RESTE sur Supabase Edge Functions ✅

**Déjà implémenté et fonctionnel:**

1. **OAuth Callbacks**
   - ✅ `notion-oauth/index.ts` - Exchange code → access token
   - ✅ `google-oauth/index.ts` - Google authentication
   - ✅ Secrets sécurisés dans Supabase Vault

2. **Stripe Integration**
   - ✅ `create-checkout/index.ts` - Créer session de paiement
   - ✅ `create-portal-session/index.ts` - Gérer abonnements
   - ✅ `webhook-stripe/index.ts` - Recevoir events Stripe
   - ✅ `get-subscription/index.ts` - Status abonnement

3. **User Management**
   - ✅ `create-user/index.ts` - Créer profil utilisateur
   - ✅ `save-notion-connection/index.ts` - Sauver tokens chiffrés
   - ✅ `get-notion-token/index.ts` - Récupérer token déchiffré

**Pourquoi garder sur Supabase?**
- ✅ Secrets OAuth/Stripe **JAMAIS exposés au client**
- ✅ Auto-scaling (géré par Supabase)
- ✅ SSL/TLS géré automatiquement
- ✅ Logs centralisés
- ✅ 500K invocations/mois gratuites (largement suffisant)

---

### Ce qui VA sur Oracle Cloud (Nouveau) 🆕

**À déployer:**

1. **Site Vitrine (Landing Page)**
   ```
   /
   ├── index.html (homepage)
   ├── /features (fonctionnalités)
   ├── /pricing (tarifs)
   ├── /docs (documentation)
   └── /blog (articles)
   ```

   **Stack:**
   - React/Vue (SPA) ou Next.js (SSG)
   - Vite/Webpack build
   - Fichiers statiques servis par Caddy

2. **Panel Utilisateur (Dashboard)**
   ```
   /dashboard
   ├── /profile (profil utilisateur)
   ├── /integrations (Notion connections)
   ├── /subscription (gestion abonnement Stripe)
   ├── /billing (factures)
   ├── /settings (paramètres)
   └── /usage (statistiques d'utilisation)
   ```

   **Stack:**
   - React SPA avec React Router
   - Authentification via Supabase Auth
   - API calls vers Supabase Edge Functions
   - Cache local (IndexedDB/LocalStorage)

3. **Backend API (Optionnel)**
   ```
   /api
   ├── /health (health check)
   ├── /stats (statistiques agrégées)
   ├── /webhooks/custom (webhooks custom si besoin)
   └── /proxy/* (proxy vers APIs tierces si CORS)
   ```

   **Stack:**
   - Node.js 20 + Express.js
   - PM2 cluster mode (4 workers)
   - Redis cache
   - Rate limiting

**Pourquoi sur Oracle Cloud?**
- ✅ **Gratuit** (Always Free Tier)
- ✅ **Contrôle total** sur le serveur
- ✅ **Performance** (pas de cold start comme Edge Functions)
- ✅ **Flexibilité** (installer n'importe quel outil)

---

## 🔐 Sécurité Multi-Couches

### Niveau 1: Cloudflare (Protection Externe)

```yaml
Protection DDoS:
  - Capacité: Plusieurs Tbps
  - Type: L3/L4/L7 (toutes les couches OSI)
  - Activation: Automatique

WAF (Web Application Firewall):
  Rules gratuites:
    - OWASP Top 10 protection
    - Bot detection
    - Rate limiting (5 règles)
    - Geo-blocking

SSL/TLS:
  - Mode: Full (strict)
  - Minimum version: TLS 1.2
  - HSTS: Preload list
```

### Niveau 2: Oracle Cloud (Firewall Réseau)

```yaml
VCN Security List:
  Ingress Rules:
    - Port 443 (HTTPS) from 0.0.0.0/0
    - Port 80 (HTTP) from 0.0.0.0/0 (redirect → HTTPS)
    - Port 22 (SSH) from VOTRE_IP/32 UNIQUEMENT ⚠️

  Egress Rules:
    - Allow all (pour callbacks OAuth, Stripe, Supabase)

iptables (VM):
  - Same rules as VCN
  - Netfilter persistent
```

### Niveau 3: Application (Caddy + Node.js)

```yaml
Caddy:
  Rate Limiting:
    - Global: 1000 req/min per IP
    - API: 100 req/min per IP
    - Auth: 5 req/15min per IP

  Security Headers:
    - HSTS: max-age=31536000
    - CSP: strict policy
    - X-Frame-Options: SAMEORIGIN
    - X-Content-Type-Options: nosniff

Node.js (Express):
  Middlewares:
    - helmet.js (security headers)
    - express-rate-limit (rate limiting)
    - cors (strict origin)
    - express-validator (input validation)

  Authentication:
    - JWT verification (Supabase)
    - Token validation (format check)
    - Session management (Redis)
```

### Niveau 4: OS (Ubuntu Hardening)

```yaml
SSH:
  - PasswordAuthentication: no
  - PubkeyAuthentication: yes
  - PermitRootLogin: no
  - Port: 22 (ou custom)

Fail2Ban:
  - SSH protection (3 attempts → ban 1h)
  - HTTP brute-force protection

Automatic Updates:
  - unattended-upgrades (security patches)
  - Weekly reboot (if needed)
```

### Niveau 5: Data (Supabase)

```yaml
Row Level Security (RLS):
  user_profiles:
    SELECT: auth.uid() = user_id
    UPDATE: auth.uid() = user_id
    DELETE: false (never delete profiles)

  notion_connections:
    SELECT: auth.uid() = user_id
    INSERT: auth.uid() = user_id
    UPDATE: auth.uid() = user_id AND is_active = true

  subscriptions:
    SELECT: auth.uid() = user_id
    UPDATE: false (only via Stripe webhooks)

Encryption:
  - Tokens: AES-256-GCM (via TOKEN_ENCRYPTION_KEY)
  - Database: Encrypted at rest (Supabase)
  - Backups: Encrypted (Supabase)
```

---

## ⚡ Optimisations Performances

### Frontend (Site Vitrine + Dashboard)

```javascript
// Vite build config (vite.config.ts)
export default {
  build: {
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['@headlessui/react', 'lucide-react']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    }
  },

  // Code splitting
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
}
```

**Optimisations:**
- ✅ Code splitting par route (React.lazy)
- ✅ Tree shaking (dead code elimination)
- ✅ Compression assets (gzip + brotli)
- ✅ Image optimization (WebP, lazy loading)
- ✅ Font subsetting (uniquement caractères utilisés)

**Performance attendue:**
- Lighthouse Score: 95+ (Performance)
- First Contentful Paint: < 1s
- Time to Interactive: < 2s
- Total Bundle Size: < 500 KB

---

### Backend Node.js (PM2 Cluster)

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'notion-clipper-api',
    script: './src/server.js',

    // Cluster mode (4 workers = 4 vCPU)
    instances: 4,
    exec_mode: 'cluster',

    // Load balancing automatique par PM2
    // Round-robin entre les 4 workers

    // Memory management
    max_memory_restart: '5G', // Restart si > 5GB

    // Auto-restart
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,

    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=5120' // 5GB heap
    }
  }]
};
```

**Optimisations:**
- ✅ Connection pooling (Supabase client réutilisé)
- ✅ Redis cache (sessions, OAuth states)
- ✅ Compression responses (gzip middleware)
- ✅ Async/await (non-blocking I/O)

**Performance attendue:**
- Latency: 15-50ms (endpoints simples)
- Throughput: 500-1000 req/s
- Memory: 2-4 GB (4 workers × 0.5-1 GB)
- CPU: 30-50% en charge normale

---

### Redis Cache Strategy

```javascript
// cache.service.js
import { createClient } from 'redis';

const redis = createClient({
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD,

  // Retry strategy
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis connection refused');
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

// Cache user sessions (1h TTL)
async function cacheUserSession(userId, sessionData) {
  await redis.setEx(
    `session:${userId}`,
    3600, // 1 hour
    JSON.stringify(sessionData)
  );
}

// Cache API responses (5min TTL)
async function cacheApiResponse(key, data, ttl = 300) {
  await redis.setEx(
    `api:${key}`,
    ttl,
    JSON.stringify(data)
  );
}

// Cache OAuth states (10min TTL, one-time use)
async function storeOAuthState(state, data) {
  await redis.setEx(`oauth:${state}`, 600, JSON.stringify(data));
}

// Invalidate cache on data change
async function invalidateCache(pattern) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

**Cache Hit Rate attendu:**
- Sessions utilisateur: 90-95%
- API responses: 70-80%
- OAuth states: 100% (single-use)

---

## 📈 Capacité & Scaling

### Phase 1: Beta (0-6 mois)

```yaml
Utilisateurs:
  Enregistrés: 1,000-10,000
  Actifs/mois: 500-2,000
  Concurrents (peak): 50-200

Performance:
  CPU: 20-40%
  RAM: 8-12 GB utilisés
  Latency: 20-50ms
  Uptime: 99.5%+

Coûts:
  Oracle Cloud: 0€
  Supabase: 0€ (< 50K active users)
  Cloudflare: 0€
  TOTAL: 0€/mois
```

### Phase 2: Growth (6-12 mois)

```yaml
Utilisateurs:
  Enregistrés: 10,000-50,000
  Actifs/mois: 2,000-10,000
  Concurrents (peak): 200-1,000

Performance:
  CPU: 40-70%
  RAM: 12-18 GB utilisés
  Latency: 30-100ms
  Uptime: 99.5%+

Coûts:
  Oracle Cloud: 0€
  Supabase: 0-25€ (selon usage DB)
  Cloudflare: 0€
  TOTAL: 0-25€/mois
```

### Phase 3: Scale (12+ mois)

```yaml
Utilisateurs:
  Enregistrés: 50,000-100,000
  Actifs/mois: 10,000-50,000
  Concurrents (peak): 1,000-2,000

Performance:
  CPU: 70-85%
  RAM: 18-22 GB utilisés
  Latency: 50-150ms
  Uptime: 99.5%+

Coûts:
  Oracle Cloud: 0€ (ou upgrade à ~50€/mois)
  Supabase: 25-100€
  Cloudflare: 0-20€ (Pro plan pour + rate limits)
  TOTAL: 25-170€/mois

Actions recommandées:
  - ✅ Load balancer + 2ème VM Oracle (gratuit!)
  - ✅ CDN pour assets (S3 + CloudFront)
  - ✅ Database read replicas (Supabase)
  - ✅ Monitoring avancé (Datadog/Grafana)
```

---

## 🚨 Signaux d'Alerte (Quand Scaler)

### Métriques à surveiller

```yaml
CPU:
  ⚠️ Warning: > 70% pendant 1h
  🚨 Critical: > 85% pendant 30min
  ✅ Action: Ajouter 2ème VM + load balancer

RAM:
  ⚠️ Warning: > 20 GB utilisés
  🚨 Critical: > 22 GB (swap actif)
  ✅ Action: Optimiser code OU upgrade VM

Latency:
  ⚠️ Warning: > 300ms (p95)
  🚨 Critical: > 500ms (p95)
  ✅ Action: Investiguer bottleneck (DB? API?)

Error Rate:
  ⚠️ Warning: > 1% (4xx/5xx)
  🚨 Critical: > 5%
  ✅ Action: Check logs, fix bugs

Disk Usage:
  ⚠️ Warning: > 150 GB / 200 GB
  🚨 Critical: > 180 GB
  ✅ Action: Cleanup logs OU add block volume
```

### Stratégie de Scaling (Toujours Gratuit!)

**Option 1: Load Balancer + 2ème VM**
```
       Cloudflare
           ↓
    Oracle Load Balancer (GRATUIT)
       /           \
   VM #1 (4 vCPU)  VM #2 (4 vCPU)

Capacité: × 2 (2,000-4,000 concurrents)
Coût: 0€ (Always Free × 2)
```

**Option 2: Séparer Frontend/Backend**
```
VM #1: Site vitrine (2 vCPU + 12 GB)
VM #2: Backend API (2 vCPU + 12 GB)

Capacité: Même total, mais séparation des concerns
Coût: 0€
```

---

## 💰 Coûts Détails (Transparent)

### Always Free (0€/mois)

**Oracle Cloud:**
- ✅ 4 OCPU ARM Ampere (ou 2 VMs × 2 OCPU)
- ✅ 24 GB RAM total
- ✅ 200 GB Block Storage
- ✅ 10 TB bandwidth/mois (outbound)
- ✅ Load Balancer (1 instance, 10 Mbps)

**Supabase:**
- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 50,000 active users/mois
- ✅ 500K Edge Function invocations/mois
- ✅ Unlimited API requests

**Cloudflare:**
- ✅ Unlimited bandwidth
- ✅ DDoS protection
- ✅ SSL/TLS certificates
- ✅ CDN mondial
- ✅ 5 rate limiting rules

**Stripe:**
- ✅ Pas de frais mensuels
- ✅ 2.9% + 0.30€ par transaction (standard)

**TOTAL:** **0€/mois** (jusqu'à limites Free Tier)

---

### Quand Payer? (Projections)

**À 10,000 utilisateurs actifs/mois:**
- Oracle Cloud: 0€ (dans Free Tier)
- Supabase: 0€ (< 50K users)
- Cloudflare: 0€
- **TOTAL: 0€**

**À 50,000 utilisateurs actifs/mois:**
- Oracle Cloud: 0€ OU upgrade volontaire à 50€ (8 vCPU + 48 GB)
- Supabase: 25€ (Pro plan)
- Cloudflare: 0€
- **TOTAL: 25-75€/mois**

**À 100,000 utilisateurs actifs/mois:**
- Oracle Cloud: 50-100€ (scaling)
- Supabase: 100-200€ (usage-based)
- Cloudflare: 20€ (Pro plan)
- **TOTAL: 170-320€/mois**

**ROI:** Si 100K users × 5% conversion × 10€/mois = **50,000€/mois revenue**
Coûts infra: 320€/mois = **0.64% du CA** 🎉

---

## ✅ Checklist Complète

### Avant Démarrage
- [ ] Compte Oracle Cloud créé (Free Tier activé)
- [ ] Domaine acheté (ex: Namecheap ~10€/an)
- [ ] Compte Cloudflare créé (gratuit)
- [ ] Repository GitHub configuré
- [ ] Clés SSH générées

### Configuration Oracle Cloud (Jour 1)
- [ ] VM Instance créée (4 vCPU + 24 GB)
- [ ] IP publique notée
- [ ] Firewall configuré (80, 443, 22)
- [ ] SSH fonctionnel
- [ ] Ubuntu à jour

### Installation Stack (Jour 1-2)
- [ ] Caddy installé
- [ ] Node.js 20 installé
- [ ] PM2 installé
- [ ] Redis installé et sécurisé
- [ ] Git configuré
- [ ] Projet cloné

### Déploiement Site (Jour 2-3)
- [ ] Frontend buildé
- [ ] Caddyfile configuré
- [ ] HTTPS activé (Let's Encrypt)
- [ ] Site accessible via HTTPS
- [ ] Backend API déployé (si applicable)
- [ ] PM2 configuré et démarré

### Cloudflare (Jour 3)
- [ ] Domaine ajouté
- [ ] DNS configurés
- [ ] Proxy activé (nuage orange)
- [ ] SSL/TLS mode: Full (strict)
- [ ] Page Rules configurées

### Sécurité (Jour 3-4)
- [ ] SSH hardening appliqué
- [ ] Fail2Ban installé
- [ ] Automatic updates activé
- [ ] Rate limiting configuré
- [ ] Firewall testé

### Monitoring (Jour 4-5)
- [ ] Script monitoring créé
- [ ] Logs configurés (logrotate)
- [ ] Backups automatiques
- [ ] Alertes configurées (optionnel)
- [ ] Uptime monitoring (UptimeRobot gratuit)

### Tests (Jour 5)
- [ ] Site accessible worldwide
- [ ] HTTPS fonctionnel (A+ sur SSLLabs)
- [ ] OAuth flows testés
- [ ] Stripe webhooks testés
- [ ] Load testing (Apache Bench)

---

## 🎓 Commandes Utiles

### Déploiement
```bash
# Deploy nouvelle version
cd /var/www/notion-clipper/src
git pull origin main
pnpm install
pnpm build:packages && pnpm build:app
cp -r apps/notion-clipper-app/dist/* /var/www/notion-clipper/frontend/
sudo systemctl reload caddy
```

### Monitoring
```bash
# CPU/RAM/Disk
htop

# Logs Caddy
sudo tail -f /var/log/caddy/access.log

# Logs PM2
pm2 logs --lines 100

# Redis info
redis-cli info stats

# Network connections
ss -tuln | grep :443 | wc -l
```

### Maintenance
```bash
# Update système
sudo apt update && sudo apt upgrade -y

# Restart services
sudo systemctl restart caddy
pm2 restart all

# Cleanup logs
sudo find /var/log/caddy/ -name "*.log" -mtime +30 -delete

# Backup
./backup.sh
```

---

**Dernière mise à jour:** 2025-11-14
**Version:** 1.0
**Projet:** NotionClipper - Architecture Optimale
