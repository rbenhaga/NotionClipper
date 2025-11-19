# Scripts - NotionClipper

## 🧪 test-notion-auth-flow.js

**Description**: Valide la sécurité du flow d'authentification Notion

**Usage**:
```bash
node scripts/test-notion-auth-flow.js
```

**Tests**:
1. ✅ Aucune clé exposée dans bundles
2. ✅ .env.example propre
3. ✅ Edge Function existe
4. ✅ AuthDataManager utilise Edge Function
5. ✅ Endpoints API corrects
6. ✅ Encryption/decryption logic

**Résultat attendu**: `✅ All tests passed! (6/6)`

**Quand l'exécuter**:
- Avant chaque déploiement
- Après modification code sécurité
- Dans pipeline CI/CD

---

**Dernière mise à jour**: 19 novembre 2025
