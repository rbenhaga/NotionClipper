# 🚀 Guide Complet : Oracle Cloud Free Tier pour NotionClipper

**Date:** 2025-11-14
**Objectif:** Site vitrine + Panel utilisateur + OAuth callbacks
**Coût:** 0€/mois (Always Free)

---

## 📋 Table des Matières

1. [Vue d'ensemble de l'architecture](#architecture)
2. [Création de la VM Instance (pas à pas)](#creation-vm)
3. [Configuration initiale du serveur](#config-serveur)
4. [Installation de la stack (Caddy + Node.js + PM2 + Redis)](#installation-stack)
5. [Déploiement du site vitrine](#deploiement-site)
6. [Configuration Cloudflare (optionnel mais recommandé)](#cloudflare)
7. [Sécurité & Hardening](#securite)
8. [Monitoring & Maintenance](#monitoring)

---

## 🏗️ Architecture Recommandée <a name="architecture"></a>

### Architecture Hybride Optimale

```
┌──────────────────────────────────────────────────┐
│  Cloudflare (CDN + DDoS Protection)             │ ← Gratuit
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│  Oracle Cloud Free Tier                         │
│  ┌────────────────────────────────────────────┐ │
│  │ VM Instance ARM Ampere A1                  │ │
│  │ • 4 vCPU                                   │ │
│  │ • 24 GB RAM                                │ │
│  │ • 200 GB Storage                           │ │
│  │ • Ubuntu 22.04 LTS                         │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ Caddy Web Server (Reverse Proxy)          │ │
│  │ • Port 443 (HTTPS auto)                   │ │
│  │ • Rate limiting                            │ │
│  └────────────────────────────────────────────┘ │
│            ↓                        ↓            │
│  ┌──────────────────┐    ┌──────────────────┐  │
│  │ Site Vitrine     │    │ Backend Node.js  │  │
│  │ (React/Vue)      │    │ (PM2 cluster)    │  │
│  │ Static files     │    │ • 4 workers      │  │
│  │ /                │    │ • /api/*         │  │
│  └──────────────────┘    └──────────────────┘  │
│                                  ↓               │
│                        ┌──────────────────┐     │
│                        │ Redis Cache      │     │
│                        │ (Sessions/OAuth) │     │
│                        └──────────────────┘     │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│  Supabase (déjà configuré)                      │
│  • Auth (Google, Notion OAuth)                  │
│  • PostgreSQL                                   │
│  • Edge Functions                               │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│  Stripe API (Subscriptions & Billing)           │
└──────────────────────────────────────────────────┘
```

### Répartition des Responsabilités

| Composant | Rôle | Hébergement |
|-----------|------|-------------|
| **Site Vitrine** | Landing page, présentation produit | Oracle Cloud (static) |
| **Panel Utilisateur** | Dashboard, gestion compte | Oracle Cloud (React SPA) |
| **OAuth Callbacks** | Notion, Google auth | **Supabase Edge Functions** ✅ |
| **Stripe Webhooks** | Gestion abonnements | **Supabase Edge Functions** ✅ |
| **API Backend** | Logique métier supplémentaire (si besoin) | Oracle Cloud (Node.js) |
| **Database** | User data, subscriptions | **Supabase** ✅ |
| **CDN** | Cache static assets | Cloudflare (gratuit) |

**Note:** Vos Edge Functions Supabase existantes gèrent déjà OAuth et Stripe. Oracle Cloud servira principalement pour le **frontend statique**.

---

## 🖥️ ÉTAPE 1 : Création de la VM Instance <a name="creation-vm"></a>

### 1.1 Connexion à Oracle Cloud

1. Allez sur https://cloud.oracle.com/
2. Cliquez sur **"Sign In"**
3. Connectez-vous avec vos identifiants Oracle Cloud

### 1.2 Navigation vers Compute Instances

```
Menu ☰ (en haut à gauche)
└─ Compute
   └─ Instances
      └─ Create Instance
```

### 1.3 Configuration de la VM (CRUCIAL pour Free Tier)

#### **Basic Information**
- **Name:** `notion-clipper-prod`
- **Compartment:** Laissez par défaut (root compartment)

#### **Placement**
- **Availability Domain:** Sélectionnez n'importe quel domaine disponible

#### **Image and Shape** ⚠️ PARTIE CRITIQUE

##### Étape 1: Changer l'image
1. Cliquez sur **"Change Image"**
2. Sélectionnez **"Canonical Ubuntu"**
3. Version: **22.04 LTS (aarch64)** ← ARM architecture
4. Cliquez sur **"Select Image"**

##### Étape 2: Changer le Shape (Type de VM)
1. Cliquez sur **"Change Shape"**
2. **Shape Series:** Sélectionnez **"Ampere"** (ARM)
3. **Shape Name:** Sélectionnez **"VM.Standard.A1.Flex"**

   ⚠️ **Configuration Free Tier Maximum:**
   ```
   OCPU count: 4
   Memory (GB): 24
   Network bandwidth (Gbps): 4
   ```

   💡 **Options alternatives** (toutes gratuites):
   - Option 1: **1 VM** avec 4 OCPU + 24 GB ← **RECOMMANDÉ**
   - Option 2: **2 VMs** avec 2 OCPU + 12 GB chacune
   - Option 3: **4 VMs** avec 1 OCPU + 6 GB chacune

4. Cliquez sur **"Select Shape"**

#### **Networking**

##### Primary VNIC Information
- **Virtual Cloud Network:** Sélectionnez votre VCN (ou créez-en un)
- **Subnet:** Public Subnet (pas Private!)
- ✅ **Assign a public IPv4 address** ← IMPORTANT

##### Add SSH Keys ⚠️ CRUCIAL
1. **SSH Keys Method:**
   - Option A: **Generate SSH key pair** (Oracle génère pour vous)
     - Cliquez sur **"Save Private Key"** → **SAUVEGARDEZ-LE IMMÉDIATEMENT**
     - Cliquez sur **"Save Public Key"** (optionnel)

   - Option B: **Upload public key files** (si vous avez déjà une clé)
     ```bash
     # Générer une clé SSH localement
     ssh-keygen -t ed25519 -C "notion-clipper-oracle" -f ~/.ssh/oracle_cloud

     # Copier la clé publique
     cat ~/.ssh/oracle_cloud.pub
     # Collez le contenu dans Oracle Cloud
     ```

⚠️ **CRITIQUE:** Sans clé SSH, vous ne pourrez JAMAIS vous connecter à la VM!

#### **Boot Volume**
- **Boot Volume Size (GB):** 50 GB (par défaut) ← Gratuit jusqu'à 200 GB
- Laissez les autres options par défaut

### 1.4 Création
1. Cliquez sur **"Create"** (en bas de page)
2. Attendez 2-3 minutes (statut passe de "PROVISIONING" à "RUNNING")

### 1.5 Récupérer l'IP publique
1. Une fois la VM créée, notez **"Public IP Address"** (ex: `123.45.67.89`)
2. Testez la connexion SSH:
   ```bash
   ssh -i ~/.ssh/oracle_cloud ubuntu@123.45.67.89
   ```

---

## 🔧 ÉTAPE 2 : Configuration Firewall Oracle Cloud <a name="config-serveur"></a>

### 2.1 Ouvrir les ports dans le VCN Security List

1. **Navigation:**
   ```
   Menu ☰ → Networking → Virtual Cloud Networks
   └─ Cliquez sur votre VCN
      └─ Security Lists
         └─ Default Security List for [VCN-Name]
            └─ Ingress Rules
               └─ Add Ingress Rules
   ```

2. **Règles à ajouter:**

   **Règle 1: HTTP (temporaire pour Let's Encrypt)**
   ```
   Source CIDR: 0.0.0.0/0
   IP Protocol: TCP
   Destination Port Range: 80
   Description: HTTP (redirect to HTTPS)
   ```

   **Règle 2: HTTPS**
   ```
   Source CIDR: 0.0.0.0/0
   IP Protocol: TCP
   Destination Port Range: 443
   Description: HTTPS
   ```

   **Règle 3: SSH (IMPORTANT: restreindre à votre IP)**
   ```
   Source CIDR: VOTRE_IP/32
   IP Protocol: TCP
   Destination Port Range: 22
   Description: SSH from my IP only
   ```

   💡 Trouvez votre IP: https://whatismyipaddress.com/

3. Cliquez sur **"Add Ingress Rules"**

### 2.2 Configurer le firewall Ubuntu (iptables)

Connectez-vous à la VM et exécutez:

```bash
# Connexion SSH
ssh -i ~/.ssh/oracle_cloud ubuntu@123.45.67.89

# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Configuration iptables
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Sauvegarder les règles
sudo netfilter-persistent save

# Vérifier les règles
sudo iptables -L -n
```

---

## 📦 ÉTAPE 3 : Installation de la Stack <a name="installation-stack"></a>

### 3.1 Installation de Caddy (Reverse Proxy + Auto-HTTPS)

```bash
# Installation
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Vérifier installation
caddy version
```

### 3.2 Installation de Node.js 20 LTS

```bash
# Installation via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier
node --version  # v20.x.x
npm --version   # 10.x.x

# Installer pnpm (votre projet utilise pnpm)
sudo npm install -g pnpm pm2

# Vérifier
pnpm --version
pm2 --version
```

### 3.3 Installation de Redis (Cache)

```bash
# Installation
sudo apt install -y redis-server

# Configuration sécurisée
sudo nano /etc/redis/redis.conf

# Modifications à faire:
# 1. Bind uniquement localhost (ligne ~69)
bind 127.0.0.1 ::1

# 2. Activer protection mode (ligne ~88)
protected-mode yes

# 3. Définir un mot de passe (ligne ~790)
requirepass VOTRE_MOT_DE_PASSE_SECURISE

# 4. Sauvegarder et quitter (Ctrl+X, Y, Enter)

# Redémarrer Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Tester
redis-cli ping  # Devrait retourner "PONG"
redis-cli -a VOTRE_MOT_DE_PASSE_SECURISE ping
```

### 3.4 Configuration Git (pour déploiement)

```bash
# Installation Git
sudo apt install -y git

# Configuration
git config --global user.name "Votre Nom"
git config --global user.email "votre@email.com"

# Générer clé SSH pour GitHub (si besoin)
ssh-keygen -t ed25519 -C "oracle-cloud-deploy" -f ~/.ssh/github_deploy
cat ~/.ssh/github_deploy.pub
# Ajoutez cette clé aux Deploy Keys de votre repo GitHub
```

---

## 🌐 ÉTAPE 4 : Déploiement du Site Vitrine <a name="deploiement-site"></a>

### 4.1 Structure des dossiers

```bash
# Créer structure
sudo mkdir -p /var/www/notion-clipper/{frontend,backend}
sudo chown -R ubuntu:ubuntu /var/www/notion-clipper
cd /var/www/notion-clipper
```

### 4.2 Cloner et builder le projet

```bash
# Cloner le repo (via SSH ou HTTPS)
git clone git@github.com:rbenhaga/NotionClipper.git src
cd src

# Installer dépendances
pnpm install

# Créer fichier .env (pour build frontend)
cat > .env << 'EOF'
# Supabase (déjà configuré)
VITE_SUPABASE_URL=https://votre-project.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key

# Notion OAuth (utilisé par Edge Functions)
VITE_NOTION_CLIENT_ID=votre-notion-client-id

# Google OAuth (utilisé par Edge Functions)
VITE_GOOGLE_CLIENT_ID=votre-google-client-id

# Stripe (public key)
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Token encryption
VITE_TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)

# URL du site
VITE_APP_URL=https://votredomaine.com
EOF

# Charger variables
source .env

# Builder le frontend (site vitrine + panel)
pnpm build:packages
pnpm build:app  # ou build:extension selon besoin

# Copier les fichiers buildés vers le dossier de déploiement
# (ajustez selon votre structure de build)
cp -r apps/notion-clipper-app/dist/* /var/www/notion-clipper/frontend/
```

### 4.3 Configuration Caddy

#### Créer le Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

#### Configuration complète:

```caddyfile
# Configuration globale
{
    email votre@email.com
}

# Site principal
votredomaine.com, www.votredomaine.com {
    # Racine du site
    root * /var/www/notion-clipper/frontend

    # Compression
    encode gzip zstd

    # Logs
    log {
        output file /var/log/caddy/access.log
    }

    # Headers de sécurité
    header {
        # HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

        # CSP
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.supabase.co https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com;"

        # Autres headers
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"

        # Désactiver header Server
        -Server
    }

    # Rate limiting (100 requêtes/min par IP)
    rate_limit {
        zone dynamic_zone {
            key {remote_host}
            events 100
            window 1m
        }
    }

    # API Backend (si vous créez un backend Node.js)
    handle /api/* {
        reverse_proxy localhost:3000
    }

    # Fallback pour SPA (React Router)
    try_files {path} {path}/ /index.html

    # Servir fichiers statiques
    file_server
}

# Sous-domaine API (optionnel)
api.votredomaine.com {
    reverse_proxy localhost:3000

    header {
        -Server
    }

    # CORS (si nécessaire)
    @cors_preflight method OPTIONS
    handle @cors_preflight {
        header {
            Access-Control-Allow-Origin "https://votredomaine.com"
            Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
            Access-Control-Allow-Headers "Content-Type, Authorization"
        }
        respond "" 204
    }
}
```

#### Appliquer la configuration:

```bash
# Vérifier syntaxe
sudo caddy validate --config /etc/caddy/Caddyfile

# Redémarrer Caddy
sudo systemctl restart caddy

# Activer au démarrage
sudo systemctl enable caddy

# Vérifier statut
sudo systemctl status caddy
```

### 4.4 (Optionnel) Backend Node.js avec PM2

Si vous avez besoin d'un backend supplémentaire:

```bash
# Créer fichier backend
mkdir -p /var/www/notion-clipper/backend
cd /var/www/notion-clipper/backend

# Créer package.json
cat > package.json << 'EOF'
{
  "name": "notion-clipper-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5",
    "redis": "^4.6.12",
    "dotenv": "^16.3.1"
  }
}
EOF

# Installer dépendances
pnpm install

# Créer serveur Express basique
mkdir -p src
cat > src/server.js << 'EOF'
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://votredomaine.com',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requêtes par IP
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Exemple d'endpoint
app.get('/api/user/stats', async (req, res) => {
  // Logique métier
  res.json({ message: 'Stats endpoint' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
EOF

# Configuration PM2
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'notion-clipper-backend',
    script: './src/server.js',
    instances: 4, // Utiliser les 4 vCPU
    exec_mode: 'cluster',
    max_memory_restart: '5G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      FRONTEND_URL: 'https://votredomaine.com'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    autorestart: true
  }]
};
EOF

# Créer dossier logs
mkdir -p logs

# Démarrer avec PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Vérifier
pm2 status
pm2 logs
```

---

## ☁️ ÉTAPE 5 : Configuration Cloudflare (Optionnel) <a name="cloudflare"></a>

### 5.1 Ajouter votre domaine

1. Créez un compte sur https://www.cloudflare.com/
2. Cliquez sur **"Add a Site"**
3. Entrez votre domaine: `votredomaine.com`
4. Sélectionnez le plan **Free** ($0/mois)

### 5.2 Configurer les DNS

1. Dans Cloudflare, allez dans **DNS → Records**
2. Ajoutez les enregistrements suivants:

```
Type: A
Name: @
Content: 123.45.67.89 (IP de votre VM Oracle)
Proxy status: Proxied (nuage orange) ✅
TTL: Auto

Type: A
Name: www
Content: 123.45.67.89
Proxy status: Proxied ✅
TTL: Auto

Type: A
Name: api (si sous-domaine API)
Content: 123.45.67.89
Proxy status: Proxied ✅
TTL: Auto
```

3. Chez votre registrar (OVH, Namecheap, etc.), modifiez les nameservers:
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```

### 5.3 Activer protections Cloudflare (Gratuit)

#### SSL/TLS
```
SSL/TLS → Overview
└─ Encryption mode: Full (strict)
```

#### Firewall Rules
```
Security → WAF → Rate limiting rules → Create rule

Rule 1: API Protection
- If: URI Path contains "/api/"
- Then: Rate limit 100 requests per minute
```

#### Page Rules (3 gratuites)
```
Rules → Page Rules → Create Page Rule

Rule 1: Cache static assets
- URL: votredomaine.com/*.{js,css,jpg,png,svg,woff2}
- Settings: Cache Level = Cache Everything

Rule 2: Force HTTPS
- URL: http://votredomaine.com/*
- Settings: Always Use HTTPS

Rule 3: Security headers
- URL: votredomaine.com/*
- Settings: Security Level = High
```

---

## 🔒 ÉTAPE 6 : Sécurité & Hardening <a name="securite"></a>

### 6.1 SSH Hardening

```bash
# Désactiver login par mot de passe
sudo nano /etc/ssh/sshd_config

# Modifier ces lignes:
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
Port 22  # Optionnel: changer pour un port custom

# Redémarrer SSH
sudo systemctl restart ssh
```

### 6.2 Fail2Ban (Protection brute-force)

```bash
# Installation
sudo apt install -y fail2ban

# Configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Activer protection SSH
[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 3600

# Démarrer
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Vérifier
sudo fail2ban-client status sshd
```

### 6.3 Automatic Security Updates

```bash
# Installation
sudo apt install -y unattended-upgrades

# Configuration
sudo dpkg-reconfigure -plow unattended-upgrades
# Sélectionnez "Yes"

# Vérifier
sudo systemctl status unattended-upgrades
```

### 6.4 Variables d'environnement sécurisées

```bash
# Créer fichier .env pour backend (si applicable)
cat > /var/www/notion-clipper/backend/.env << 'EOF'
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://votre-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=votre-mot-de-passe-redis

# Token encryption
TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Frontend URL
FRONTEND_URL=https://votredomaine.com
EOF

# Permissions strictes
chmod 600 /var/www/notion-clipper/backend/.env
```

---

## 📊 ÉTAPE 7 : Monitoring & Maintenance <a name="monitoring"></a>

### 7.1 Monitoring Basique avec Scripts

#### Script de monitoring système

```bash
# Créer script
cat > /home/ubuntu/monitor.sh << 'EOF'
#!/bin/bash

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== System Monitor ==="
echo "Date: $(date)"
echo ""

# CPU
echo -e "${YELLOW}CPU Usage:${NC}"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,/% used/'

# Memory
echo -e "${YELLOW}Memory Usage:${NC}"
free -h | grep Mem | awk '{print $3 "/" $2 " (" $3/$2*100 "%)"}'

# Disk
echo -e "${YELLOW}Disk Usage:${NC}"
df -h / | grep / | awk '{print $3 "/" $2 " (" $5 ")"}'

# Services
echo -e "${YELLOW}Services Status:${NC}"
systemctl is-active caddy && echo -e "Caddy: ${GREEN}Running${NC}" || echo -e "Caddy: ${RED}Stopped${NC}"
systemctl is-active redis-server && echo -e "Redis: ${GREEN}Running${NC}" || echo -e "Redis: ${RED}Stopped${NC}"

# PM2 (si backend Node.js)
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 Status:${NC}"
    pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"'
fi

# Network
echo -e "${YELLOW}Network Connections:${NC}"
ss -tuln | grep :443 | wc -l | awk '{print $1 " HTTPS connections"}'

echo ""
echo "=== End Monitor ==="
EOF

# Rendre exécutable
chmod +x /home/ubuntu/monitor.sh

# Tester
./monitor.sh
```

#### Cron job pour logs quotidiens

```bash
# Ajouter au crontab
crontab -e

# Ajouter ces lignes:
# Monitoring quotidien à 9h
0 9 * * * /home/ubuntu/monitor.sh >> /var/log/daily_monitor.log 2>&1

# Nettoyage logs anciens (>30 jours)
0 2 * * 0 find /var/log/caddy/ -name "*.log" -mtime +30 -delete
```

### 7.2 Gestion des logs

```bash
# Configurer logrotate pour Caddy
sudo nano /etc/logrotate.d/caddy

# Ajouter:
/var/log/caddy/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 caddy caddy
    sharedscripts
    postrotate
        systemctl reload caddy
    endscript
}
```

### 7.3 Backup automatique

```bash
# Script de backup
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup frontend
tar -czf $BACKUP_DIR/frontend_$DATE.tar.gz /var/www/notion-clipper/frontend

# Backup backend (si existe)
if [ -d "/var/www/notion-clipper/backend" ]; then
    tar -czf $BACKUP_DIR/backend_$DATE.tar.gz /var/www/notion-clipper/backend
fi

# Backup Caddyfile
cp /etc/caddy/Caddyfile $BACKUP_DIR/Caddyfile_$DATE

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/ubuntu/backup.sh

# Ajouter au crontab (backup quotidien à 3h)
crontab -e
# Ajouter:
0 3 * * * /home/ubuntu/backup.sh >> /var/log/backup.log 2>&1
```

---

## 🎯 Checklist Finale

### Avant mise en production

- [ ] VM Oracle Cloud créée (4 vCPU + 24 GB)
- [ ] Firewall configuré (ports 80, 443, 22)
- [ ] Caddy installé et configuré
- [ ] Node.js 20 LTS installé
- [ ] Redis installé et sécurisé
- [ ] Site vitrine déployé et accessible
- [ ] HTTPS activé (Let's Encrypt via Caddy)
- [ ] Cloudflare configuré (optionnel)
- [ ] SSH hardening appliqué
- [ ] Fail2Ban activé
- [ ] Automatic updates activé
- [ ] Monitoring scripts en place
- [ ] Backups automatiques configurés

### Variables d'environnement à configurer

```bash
# Sur Oracle Cloud VM
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_NOTION_CLIENT_ID=
VITE_GOOGLE_CLIENT_ID=
VITE_STRIPE_PUBLIC_KEY=
VITE_TOKEN_ENCRYPTION_KEY=
VITE_APP_URL=

# Supabase Edge Functions (déjà configuré)
NOTION_CLIENT_SECRET=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
TOKEN_ENCRYPTION_KEY=
```

---

## 📈 Capacité Estimée

### Avec configuration 4 vCPU + 24 GB + Redis + Cloudflare

**Site Vitrine:**
- ✅ **Illimité** (servi par Cloudflare CDN)
- Latency: < 50ms worldwide

**Panel Utilisateur (SPA React):**
- ✅ **10,000-50,000 utilisateurs** actifs/mois
- ✅ **1,000-2,000 concurrents**

**Backend Node.js (si créé):**
- ✅ **500-1,000 requêtes/seconde**
- ✅ **5,000-10,000 utilisateurs** actifs/jour

**OAuth Callbacks (Supabase Edge Functions):**
- ✅ **Géré par Supabase** (auto-scaling)

---

## 🚀 Commandes de Déploiement Rapide

### Déployer une nouvelle version

```bash
# SSH vers VM
ssh -i ~/.ssh/oracle_cloud ubuntu@123.45.67.89

# Pull dernières modifications
cd /var/www/notion-clipper/src
git pull origin main

# Rebuild frontend
pnpm install
pnpm build:packages
pnpm build:app

# Copier vers production
cp -r apps/notion-clipper-app/dist/* /var/www/notion-clipper/frontend/

# Redémarrer services
sudo systemctl reload caddy

# Si backend Node.js
cd /var/www/notion-clipper/backend
git pull
pnpm install
pm2 reload all

# Vérifier logs
pm2 logs --lines 50
sudo tail -f /var/log/caddy/access.log
```

---

## 🆘 Troubleshooting

### Caddy ne démarre pas
```bash
# Vérifier logs
sudo journalctl -u caddy -f

# Tester configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Vérifier ports
sudo ss -tuln | grep -E ':(80|443)'
```

### Site inaccessible (502 Bad Gateway)
```bash
# Vérifier que Caddy tourne
sudo systemctl status caddy

# Vérifier firewall Oracle Cloud
# → Aller dans console Oracle Cloud → Security Lists

# Vérifier iptables
sudo iptables -L -n | grep -E '(80|443)'
```

### Backend Node.js crash
```bash
# Vérifier logs PM2
pm2 logs

# Vérifier mémoire
pm2 monit

# Redémarrer
pm2 restart all
```

---

## 📚 Ressources Additionnelles

- [Oracle Cloud Free Tier Docs](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Cloudflare Free Plan](https://www.cloudflare.com/plans/free/)

---

**Guide créé le:** 2025-11-14
**Dernière mise à jour:** 2025-11-14
**Auteur:** Claude Code Assistant
**Projet:** NotionClipper - Oracle Cloud Setup
