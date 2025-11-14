#!/bin/bash
################################################################################
# Oracle Cloud Free Tier - Setup Automatique
# NotionClipper Production Environment
#
# Usage:
#   chmod +x setup-oracle-cloud.sh
#   sudo ./setup-oracle-cloud.sh
################################################################################

set -e  # Exit on error

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Ce script doit être exécuté avec sudo"
        exit 1
    fi
}

# Vérifications préliminaires
check_root

print_header "🚀 NotionClipper - Oracle Cloud Setup"
echo "Ce script va installer:"
echo "  • Caddy (reverse proxy + auto-HTTPS)"
echo "  • Node.js 20 LTS"
echo "  • pnpm + PM2"
echo "  • Redis"
echo "  • Configuration firewall"
echo "  • Fail2Ban"
echo ""
read -p "Continuer? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

################################################################################
# ÉTAPE 1: Mise à jour système
################################################################################
print_header "📦 Mise à jour du système"
apt update
apt upgrade -y
apt install -y curl wget git unzip software-properties-common apt-transport-https \
    ca-certificates gnupg lsb-release build-essential
print_success "Système mis à jour"

################################################################################
# ÉTAPE 2: Configuration firewall Ubuntu
################################################################################
print_header "🔥 Configuration Firewall (iptables)"

# Installer netfilter-persistent
apt install -y iptables-persistent netfilter-persistent

# Ouvrir ports HTTP/HTTPS
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Sauvegarder règles
netfilter-persistent save

print_success "Firewall configuré (ports 80, 443 ouverts)"

################################################################################
# ÉTAPE 3: Installation Caddy
################################################################################
print_header "🌐 Installation Caddy"

# Ajouter repo Caddy
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
    gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
    tee /etc/apt/sources.list.d/caddy-stable.list

apt update
apt install -y caddy

# Vérifier installation
CADDY_VERSION=$(caddy version | head -n 1)
print_success "Caddy installé: $CADDY_VERSION"

################################################################################
# ÉTAPE 4: Installation Node.js 20 LTS
################################################################################
print_header "📦 Installation Node.js 20 LTS"

# Ajouter repo NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Vérifier installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js installé: $NODE_VERSION"
print_success "npm installé: v$NPM_VERSION"

################################################################################
# ÉTAPE 5: Installation pnpm et PM2
################################################################################
print_header "📦 Installation pnpm & PM2"

npm install -g pnpm pm2

PNPM_VERSION=$(pnpm --version)
PM2_VERSION=$(pm2 --version)
print_success "pnpm installé: v$PNPM_VERSION"
print_success "PM2 installé: v$PM2_VERSION"

################################################################################
# ÉTAPE 6: Installation Redis
################################################################################
print_header "🗄️ Installation Redis"

apt install -y redis-server

# Backup config originale
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Configuration sécurisée
print_warning "Configuration Redis..."

# Générer mot de passe Redis
REDIS_PASSWORD=$(openssl rand -base64 32)

# Modifier config Redis
sed -i 's/^bind 127.0.0.1 ::1/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
sed -i 's/^protected-mode no/protected-mode yes/' /etc/redis/redis.conf
sed -i "s/^# requirepass foobared/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf

# Redémarrer Redis
systemctl restart redis-server
systemctl enable redis-server

print_success "Redis installé et sécurisé"
print_warning "Mot de passe Redis: $REDIS_PASSWORD"
print_warning "SAUVEGARDEZ CE MOT DE PASSE!"

# Sauvegarder dans fichier
echo "REDIS_PASSWORD=$REDIS_PASSWORD" > /root/.redis_password
chmod 600 /root/.redis_password
print_success "Mot de passe sauvegardé dans: /root/.redis_password"

################################################################################
# ÉTAPE 7: Fail2Ban
################################################################################
print_header "🔒 Installation Fail2Ban"

apt install -y fail2ban

# Configuration SSH jail
cat > /etc/fail2ban/jail.d/sshd.conf << 'EOF'
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
EOF

# Démarrer Fail2Ban
systemctl restart fail2ban
systemctl enable fail2ban

print_success "Fail2Ban installé et configuré"

################################################################################
# ÉTAPE 8: Automatic Security Updates
################################################################################
print_header "🔄 Configuration Automatic Updates"

apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

print_success "Automatic updates configurés"

################################################################################
# ÉTAPE 9: Création structure dossiers
################################################################################
print_header "📁 Création structure dossiers"

mkdir -p /var/www/notion-clipper/{frontend,backend,src}
mkdir -p /var/log/notion-clipper
mkdir -p /home/ubuntu/backups

# Permissions
chown -R ubuntu:ubuntu /var/www/notion-clipper
chown -R ubuntu:ubuntu /home/ubuntu/backups

print_success "Structure dossiers créée"

################################################################################
# ÉTAPE 10: Caddyfile de base
################################################################################
print_header "📝 Création Caddyfile de base"

read -p "Entrez votre domaine (ex: example.com): " DOMAIN
read -p "Entrez votre email (pour Let's Encrypt): " EMAIL

cat > /etc/caddy/Caddyfile << EOF
{
    email ${EMAIL}
}

# Configuration temporaire (avant DNS)
:80 {
    respond "NotionClipper - Oracle Cloud Setup OK! 🚀"
}

# Décommentez après configuration DNS:
# ${DOMAIN} {
#     root * /var/www/notion-clipper/frontend
#     encode gzip
#     file_server
#     try_files {path} /index.html
# }
EOF

# Valider et redémarrer Caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl restart caddy
systemctl enable caddy

print_success "Caddyfile créé (configuration temporaire)"

################################################################################
# ÉTAPE 11: Scripts utilitaires
################################################################################
print_header "🛠️ Création scripts utilitaires"

# Script monitoring
cat > /home/ubuntu/monitor.sh << 'SCRIPT_EOF'
#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== NotionClipper System Monitor ==="
echo "Date: $(date)"
echo ""

# CPU
echo -e "${YELLOW}CPU Usage:${NC}"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,/% used/'

# Memory
echo -e "${YELLOW}Memory Usage:${NC}"
free -h | grep Mem | awk '{print $3 "/" $2}'

# Disk
echo -e "${YELLOW}Disk Usage:${NC}"
df -h / | grep / | awk '{print $3 "/" $2 " (" $5 ")"}'

# Services
echo -e "${YELLOW}Services Status:${NC}"
systemctl is-active caddy && echo -e "Caddy: ${GREEN}Running${NC}" || echo -e "Caddy: ${RED}Stopped${NC}"
systemctl is-active redis-server && echo -e "Redis: ${GREEN}Running${NC}" || echo -e "Redis: ${RED}Stopped${NC}"
systemctl is-active fail2ban && echo -e "Fail2Ban: ${GREEN}Running${NC}" || echo -e "Fail2Ban: ${RED}Stopped${NC}"

# PM2
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 Apps:${NC}"
    sudo -u ubuntu pm2 jlist 2>/dev/null | jq -r '.[] | "\(.name): \(.pm2_env.status)"' 2>/dev/null || echo "No apps"
fi

echo ""
SCRIPT_EOF

chmod +x /home/ubuntu/monitor.sh
chown ubuntu:ubuntu /home/ubuntu/monitor.sh

# Script backup
cat > /home/ubuntu/backup.sh << 'SCRIPT_EOF'
#!/bin/bash

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup frontend
if [ -d "/var/www/notion-clipper/frontend" ]; then
    tar -czf $BACKUP_DIR/frontend_$DATE.tar.gz /var/www/notion-clipper/frontend 2>/dev/null
fi

# Backup backend
if [ -d "/var/www/notion-clipper/backend" ]; then
    tar -czf $BACKUP_DIR/backend_$DATE.tar.gz /var/www/notion-clipper/backend 2>/dev/null
fi

# Backup Caddyfile
cp /etc/caddy/Caddyfile $BACKUP_DIR/Caddyfile_$DATE

# Garder 7 derniers backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
SCRIPT_EOF

chmod +x /home/ubuntu/backup.sh
chown ubuntu:ubuntu /home/ubuntu/backup.sh

print_success "Scripts utilitaires créés"
print_success "  • /home/ubuntu/monitor.sh (monitoring)"
print_success "  • /home/ubuntu/backup.sh (backups)"

################################################################################
# ÉTAPE 12: Fichier .env template
################################################################################
print_header "📝 Création .env template"

cat > /var/www/notion-clipper/.env.template << 'ENV_EOF'
# Node.js Environment
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://votre-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key

# Redis (généré automatiquement)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=CHANGEME

# Token Encryption (générer avec: openssl rand -base64 32)
TOKEN_ENCRYPTION_KEY=

# Frontend URL
FRONTEND_URL=https://votredomaine.com

# Vite (pour build frontend)
VITE_SUPABASE_URL=https://votre-project.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key
VITE_NOTION_CLIENT_ID=votre-notion-client-id
VITE_GOOGLE_CLIENT_ID=votre-google-client-id
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_TOKEN_ENCRYPTION_KEY=
VITE_APP_URL=https://votredomaine.com
ENV_EOF

# Remplacer REDIS_PASSWORD
sed -i "s/REDIS_PASSWORD=CHANGEME/REDIS_PASSWORD=$REDIS_PASSWORD/" /var/www/notion-clipper/.env.template

chown ubuntu:ubuntu /var/www/notion-clipper/.env.template

print_success "Fichier .env.template créé"

################################################################################
# RÉSUMÉ FINAL
################################################################################
print_header "✅ Installation Terminée!"

echo ""
echo "📋 Composants installés:"
echo "  ✓ Ubuntu 22.04 LTS (mis à jour)"
echo "  ✓ Caddy $(caddy version | head -n 1)"
echo "  ✓ Node.js $(node --version)"
echo "  ✓ pnpm v$(pnpm --version)"
echo "  ✓ PM2 v$(pm2 --version)"
echo "  ✓ Redis (sécurisé)"
echo "  ✓ Fail2Ban (actif)"
echo "  ✓ Automatic Updates (actif)"
echo ""

echo "📁 Structure:"
echo "  • /var/www/notion-clipper/frontend (site vitrine)"
echo "  • /var/www/notion-clipper/backend (API Node.js)"
echo "  • /var/www/notion-clipper/src (code source)"
echo "  • /home/ubuntu/backups (backups automatiques)"
echo ""

echo "🔑 Credentials:"
echo "  • Redis password: /root/.redis_password"
echo "  • .env template: /var/www/notion-clipper/.env.template"
echo ""

echo "🛠️ Scripts utiles:"
echo "  • Monitoring: /home/ubuntu/monitor.sh"
echo "  • Backup: /home/ubuntu/backup.sh"
echo ""

echo "📝 Prochaines étapes:"
echo ""
echo "1. Configurer DNS vers cette VM:"
print_warning "   A record: votredomaine.com → $(curl -s ifconfig.me)"
echo ""
echo "2. Cloner le projet:"
echo "   su - ubuntu"
echo "   cd /var/www/notion-clipper/src"
echo "   git clone https://github.com/rbenhaga/NotionClipper.git ."
echo ""
echo "3. Configurer variables d'environnement:"
echo "   cp /var/www/notion-clipper/.env.template /var/www/notion-clipper/src/.env"
echo "   nano /var/www/notion-clipper/src/.env"
echo ""
echo "4. Builder le frontend:"
echo "   cd /var/www/notion-clipper/src"
echo "   pnpm install"
echo "   pnpm build:packages && pnpm build:app"
echo "   cp -r apps/notion-clipper-app/dist/* /var/www/notion-clipper/frontend/"
echo ""
echo "5. Configurer Caddyfile avec votre domaine:"
echo "   sudo nano /etc/caddy/Caddyfile"
echo "   sudo systemctl reload caddy"
echo ""
echo "6. (Optionnel) Déployer backend Node.js:"
echo "   Voir: ORACLE_CLOUD_SETUP_GUIDE.md étape 4.4"
echo ""

print_success "Setup terminé! 🎉"
echo ""
print_warning "N'oubliez pas de:"
print_warning "  • Configurer SSH hardening (voir guide)"
print_warning "  • Restreindre port 22 à votre IP dans Oracle Cloud Console"
print_warning "  • Configurer Cloudflare pour DDoS protection"
echo ""

# Sauvegarder informations importantes
cat > /root/installation_summary.txt << SUMMARY_EOF
NotionClipper - Oracle Cloud Setup Summary
==========================================
Date: $(date)

IP publique: $(curl -s ifconfig.me)
Redis password: $REDIS_PASSWORD

Composants installés:
- Caddy: $(caddy version | head -n 1)
- Node.js: $(node --version)
- pnpm: v$(pnpm --version)
- PM2: v$(pm2 --version)
- Redis: Installé et sécurisé
- Fail2Ban: Actif
- Automatic Updates: Actif

Scripts:
- /home/ubuntu/monitor.sh
- /home/ubuntu/backup.sh

Configuration:
- Caddyfile: /etc/caddy/Caddyfile
- .env template: /var/www/notion-clipper/.env.template

SUMMARY_EOF

print_success "Résumé sauvegardé: /root/installation_summary.txt"
