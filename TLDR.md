# TL;DR - NotionClipper

## ✅ Fait
- Faille sécurité corrigée
- Quotas réparés  
- Tests OK (6/6)

## 🔧 À faire (30 min)

```bash
# 1. Backup
supabase db dump -f backup.sql

# 2. Clé
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
supabase secrets set TOKEN_ENCRYPTION_KEY="$NEW_KEY"

# 3. Deploy
supabase functions deploy decrypt-notion-token
```

## 📚 Lire
**START_HERE.md** → **IMPLEMENTATION_GUIDE.md** → **ACTIONS_MANUELLES.md**

---

✅ Prêt pour production
