# Actions Manuelles Requises

**Date**: 19 novembre 2025  
**Durée totale**: 1-2 heures

---

## 🎯 Vue d'Ensemble

Toutes les corrections de code sont appliquées. Il reste **5 actions manuelles** à effectuer pour déployer en production.

---

## ✅ Actions Obligatoires (3)

### 1️⃣ Backup Database

**Commande**:
```bash
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
```

**Pourquoi**: Sécurité en cas de problème  
**Durée**: 2-5 minutes  
**Quand**: MAINTENANT (avant tout)

---

### 2️⃣ Configurer Clé de Chiffrement

**Commandes**:
```bash
# Générer clé 32 bytes
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Sauvegarder (IMPORTANT - garder en lieu sûr)
echo "$NEW_KEY" > .encryption_key_backup.txt
chmod 600 .encryption_key_backup.txt

# Définir dans Supabase Vault
supabase secrets set TOKEN_ENCRYPTION_KEY="$NEW_KEY"

# Vérifier
supabase secrets list | grep TOKEN_ENCRYPTION_KEY
```

**Pourquoi**: Edge Function a besoin de cette clé  
**Durée**: 1 minute  
**Quand**: Avant de déployer Edge Function

---

### 3️⃣ Déployer Edge Function

**Commandes**:
```bash
# 1. Connexion Supabase
supabase login
supabase link --project-ref <your-project-ref>

# 2. Déployer
supabase functions deploy decrypt-notion-token

# 3. Vérifier
supabase functions list
# Résultat attendu: decrypt-notion-token | ACTIVE

# 4. Tester
curl -X POST https://<project-ref>.supabase.co/functions/v1/decrypt-notion-token \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "<test-user-id>"}'
# Résultat attendu: {"success": true, ...}
```

**Pourquoi**: Frontend appelle cette fonction  
**Durée**: 2-3 minutes  
**Quand**: Après avoir configuré la clé

---

## 🟡 Actions Recommandées (2)

### 4️⃣ Tester en Staging

**Actions**:
1. Déployer sur environnement staging
2. Tester login Notion
3. Tester send clip
4. Tester upload file
5. Vérifier quotas

**Pourquoi**: Détecter problèmes avant production  
**Durée**: 15-30 minutes  
**Quand**: Avant déploiement production

---

### 5️⃣ Rotation de Clé (Optionnel)

**⚠️ Nécessite downtime 15-30 minutes**

**Commandes**:
```bash
# 1. Backup critique
supabase db dump -f backup_pre_rotation_$(date +%Y%m%d_%H%M%S).sql

# 2. Configurer
OLD_KEY=$(supabase secrets list | grep TOKEN_ENCRYPTION_KEY | awk '{print $2}')
supabase secrets set OLD_TOKEN_ENCRYPTION_KEY="$OLD_KEY"
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
supabase secrets set TOKEN_ENCRYPTION_KEY="$NEW_KEY"
ADMIN_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
supabase secrets set ADMIN_ROTATION_TOKEN="$ADMIN_TOKEN"

# 3. Déployer fonction rotation
supabase functions deploy rotate-encryption-key

# 4. Exécuter rotation
curl -X POST https://<project-ref>.supabase.co/functions/v1/rotate-encryption-key \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -H "apikey: <anon-key>"

# 5. Vérifier résultat
# {"success": true, "migrated": X, "failed": 0}

# 6. Nettoyage
supabase secrets unset OLD_TOKEN_ENCRYPTION_KEY
supabase secrets unset ADMIN_ROTATION_TOKEN
```

**Pourquoi**: Remplacer clé potentiellement compromise  
**Durée**: 1-2 heures (incluant downtime)  
**Quand**: Si clé a été exposée ou par précaution

---

## 📋 Checklist Complète

### Préparation
- [ ] Lire IMPLEMENTATION_GUIDE.md
- [ ] Accès Supabase Dashboard OK
- [ ] Accès Supabase CLI OK
- [ ] Node.js >= 18.x installé

### Exécution
- [ ] 1️⃣ Backup DB créé
- [ ] 2️⃣ Clé configurée dans Vault
- [ ] 3️⃣ Edge Function déployée
- [ ] 4️⃣ Tests staging OK (recommandé)
- [ ] 5️⃣ Rotation clé (optionnel)

### Validation
- [ ] Tests automatiques passent: `node scripts/test-notion-auth-flow.js`
- [ ] Login Notion fonctionne
- [ ] Send clip fonctionne
- [ ] Upload file fonctionne
- [ ] Quota system fonctionne

---

## 🚀 Ordre d'Exécution

```
1. Backup DB (5 min)
   ↓
2. Configurer clé Vault (1 min)
   ↓
3. Déployer Edge Function (3 min)
   ↓
4. Tester staging (30 min) [RECOMMANDÉ]
   ↓
5. Déployer frontend
   ↓
6. Valider production (15 min)
   ↓
7. Rotation clé (2h) [OPTIONNEL]
```

**Durée totale**: 1-2 heures (sans rotation)

---

## 🆘 En Cas de Problème

### Edge Function ne répond pas
```bash
supabase functions logs decrypt-notion-token --tail
supabase functions deploy decrypt-notion-token --no-verify-jwt
```

### Clé invalide
```bash
# Vérifier format (doit être 32 bytes)
echo "$KEY" | base64 -d | wc -c
# Résultat attendu: 32
```

### Rollback
```bash
# Restaurer backup
psql -h db.<project-ref>.supabase.co -U postgres -d postgres < backup_*.sql

# Restaurer ancienne clé
supabase secrets set TOKEN_ENCRYPTION_KEY="<old_key>"
```

---

## 📞 Support

**Documentation complète**: IMPLEMENTATION_GUIDE.md  
**Tests**: `node scripts/test-notion-auth-flow.js`  
**Logs**: `supabase functions logs decrypt-notion-token --tail`

---

**Dernière mise à jour**: 19 novembre 2025  
**Status**: ✅ Prêt à exécuter
