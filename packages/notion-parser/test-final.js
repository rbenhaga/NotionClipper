const { parseContent } = require('./dist/parseContent.js');

// Contenu exact fourni par l'utilisateur (simplifié pour éviter les problèmes d'échappement)
const userTestContent = `# Test COMPLET - Fonctionnalités Notion Parser v2.1

## Document de validation des fonctionnalités normales

Ce document teste toutes les fonctionnalités de parsing markdown vers Notion API.

---

## 📝 Section 1: Hiérarchie des titres

# Titre H1 - Niveau 1
## Titre H2 - Niveau 2
### Titre H3 - Niveau 3

---

## ✨ Section 2: Formatage inline (Rich Text)

Texte **en gras** pour l'emphase forte.
Texte *en italique* pour l'emphase légère.
Texte ***gras et italique*** combinés.
Texte __souligné__ avec underscores doubles.
Texte ~~barré~~ avec tildes.
Voici du \`code inline\` dans une phrase.
Voici un [lien cliquable](https://notion.so) dans le texte.
Combinaison: **gras avec \`code\` et [lien](https://example.com)** dans la même portion.

---

## 📋 Section 3: Listes à puces

- Premier élément de liste simple
- Deuxième élément avec **formatage gras**
- Troisième élément avec *italique*
  - Sous-élément niveau 2
    - Sous-élément niveau 3 (max depth)
  - Retour niveau 2
- Retour niveau 1

* Liste avec astérisques
* Compatible aussi

+ Liste avec plus
+ Également supportée

---

## 🔢 Section 4: Listes numérotées

1. Premier élément numéroté
2. Deuxième avec **gras**
3. Troisième normal
   1. Sous-liste numérotée
   2. Deuxième sous-élément
      1. Niveau 3 maximum
   3. Retour niveau 2
4. Retour niveau principal
5. Dernier avec \`code inline\`

---

## ☑️ Section 5: Listes de tâches (To-do)

- [ ] Tâche non cochée simple
- [x] Tâche terminée
- [ ] Tâche avec **formatage gras**
- [x] Tâche avec *italique* terminée
- [ ] Tâche avec \`code inline\`
- [x] Tâche avec [lien](https://notion.so)
- [ ] Tâche avec ~~texte barré~~

---

## 🔽 Section 6: Toggle Lists (Listes déroulantes)

> Ceci est un toggle principal
> Contenu qui peut être masqué
> Supporte **gras** et *italique*

> Un autre toggle séparé
> Avec son propre contenu

---

## 🎨 Section 7: Callouts (6 types)

> [!NOTE]
> Note importante avec formatage **gras** et *italique*

> [!INFO]
> Information utile avec \`code inline\`

> [!TIP]
> Conseil pratique avec [lien](https://example.com)

> [!WARNING]
> Avertissement sérieux à prendre en compte

> [!DANGER]
> Danger critique - attention maximale requise

> [!SUCCESS]
> Succès confirmé avec ~~ancien texte~~ remplacé

---

## 💬 Section 8: Citations (Blockquotes)

> Citation simple sur une ligne

> Citation multi-ligne
> Deuxième ligne de la citation
> Avec **formatage** inclus

> > Citation imbriquée niveau 2
> > Supportée aussi

---

## 💻 Section 9: Blocs de code (Tous les langages)

### JavaScript
\`\`\`javascript
function parseNotionBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\\n');
  for (const line of lines) {
    blocks.push(parseLine(line));
  }
  return blocks;
}
\`\`\`

### TypeScript
\`\`\`typescript
interface NotionBlock {
  type: string;
  content: RichText[];
  children?: NotionBlock[];
}

const block: NotionBlock = {
  type: 'paragraph',
  content: []
};
\`\`\`

### Python
\`\`\`python
def convert_to_notion(text):
    """Convertit markdown en blocs Notion"""
    blocks = []
    for line in text.split('\\n'):
        block = parse_line(line)
        blocks.append(block)
    return blocks
\`\`\`

### Code sans langage
\`\`\`
Bloc de code générique
Sans coloration syntaxique
Préserve les espaces    et    l'indentation
    Indentation préservée
\`\`\`

---

## 🧮 Section 10: Équations LaTeX

### Équations inline
L'énergie est $E = mc^2$ selon Einstein.
Le théorème de Pythagore: $a^2 + b^2 = c^2$.

### Équations en bloc
$$\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)$$

$$\\frac{d}{dx} \\left( \\int_{a}^{x} f(t) \\, dt \\right) = f(x)$$

---

## 📊 Section 11: Tableaux Markdown

| Colonne 1 | Colonne 2 | Colonne 3 | Colonne 4 | Colonne 5 |
|-----------|-----------|-----------|-----------|-----------|
| Texte     | **Gras**  | *Italique*| \`Code\`    | Normal    |
| 123       | 456       | 789       | 000       | ~~Barré~~ |
| [Lien](x) | A         | B         | C         | D         |

### Tableau avec alignement
| Gauche | Centre | Droite |
|:-------|:------:|-------:|
| A      | B      | C      |
| 1      | 2      | 3      |

---

## 📈 Section 12: CSV (Détection automatique headers)
Name,Age,City,Country,Status
John,30,Paris,France,Active
Jane,25,London,UK,Active
Bob,35,New York,USA,Inactive
Alice,28,Berlin,Germany,Active

---

## 🖼️ Section 13: Images

### Syntaxe Markdown
![Logo Notion](https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png)

### URL directe
https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png

---

## 🎥 Section 14: Vidéos

### YouTube
https://www.youtube.com/watch?v=dQw4w9WgXcQ

### Vimeo
https://vimeo.com/148751763

---

## 🎵 Section 15: Audio (Nouveau v2.1)

### Fichiers audio directs
https://example.com/podcast.mp3
https://example.com/music.wav
https://example.com/sound.ogg

---

## 🔗 Section 16: Bookmarks (Liens enrichis)

https://www.notion.so
https://github.com/makenotion/notion-sdk-js
https://stackoverflow.com/questions/123456

---

## 🔤 Section 17: Caractères spéciaux et Unicode

Émojis: 🚀 ⭐ 💡 ✨ 🎨 📚 ⚡ 🔥 💯 ✅
Flèches: → ← ↑ ↓ ↔ ↕ ⇒ ⇐ ⇑ ⇓
Symboles: © ® ™ § ¶ † ‡ • ° ※
Math: ∞ ≈ ≠ ≤ ≥ ± × ÷ √ ∑ ∏ ∫
Devises: $ € £ ¥ ¢ ₹ ₽ ₿
Langues: 中文 日本語 한글 العربية עברית ελληνικά русский

---

## 🔀 Section 18: Imbrications complexes

### Listes mixtes
1. Liste numérotée avec **gras**
   - Sous-liste à puces avec *italique*
   - [ ] Checkbox imbriqué avec \`code\`
   - Retour aux puces
2. Retour numéroté avec [lien](https://example.com)

### Formatage multiple
Texte avec **gras contenant \`code inline\` et *italique imbriqué*** plus [lien](url).

### Tableau avec formatage riche
| **Gras** | *Italique* | ***Les deux*** | \`Code\` | ~~Barré~~ |
|----------|------------|----------------|--------|-----------|
| [Lien](x)| Normal     | **\`Gras code\`**| *~~I+B~~* | Fin    |

---

## 🏗️ Section 19: Toggle Headings (Titres déroulants)

> # Toggle H1 Principal
> Contenu sous le H1 déroulant
> Avec plusieurs lignes
> Et du **formatage**

> ## Toggle H2 Secondaire
> Contenu du H2
> - Avec une liste
> - À puces

> ### Toggle H3 Tertiaire
> Contenu du H3
> 1. Avec liste
> 2. Numérotée

---

## 📐 Section 20: Dividers (Séparateurs)

Ligne horizontale avec 3 tirets:
---

Ligne avec 3 astérisques:
***

Ligne avec 3 underscores:
___

---

## ✅ Checklist de validation

Si le parsing est correct, tous ces éléments doivent être présents:
- [x] Titres H1, H2, H3 correctement hiérarchisés
- [x] Formatage: **gras**, *italique*, ~~barré~~, __souligné__, \`code\`
- [x] Listes: puces, numérotées, checkboxes
- [x] Toggle lists et toggle headings
- [x] Callouts: 6 types différents
- [x] Citations (blockquotes)
- [x] Code: 4+ langages avec coloration
- [x] LaTeX: inline ($) et bloc ($$)
- [x] Tableaux: Markdown, CSV
- [x] Médias: Images, Vidéos, Audio
- [x] Liens: simples, bookmarks
- [x] Emojis et Unicode
- [x] Dividers (---)
- [x] Imbrications complexes

---

**Document de test fonctionnalités - v2.1**
**Conforme au Cahier des Charges Notion Parser**`;

console.log('🎯 TEST FINAL - Contenu utilisateur complet\n');

try {
  const startTime = Date.now();
  
  const result = parseContent(userTestContent, { 
    contentType: 'auto', // Laisser le parser détecter automatiquement
    conversion: {
      preserveFormatting: true,
      convertLinks: true,
      convertImages: true,
      convertTables: true,
      convertCode: true
    },
    skipValidation: false,
    includeValidation: true,
    includeMetadata: true
  });
  
  const endTime = Date.now();
  
  console.log(`✅ Parsing réussi: ${result.success}`);
  console.log(`📊 Nombre de blocs générés: ${result.blocks.length}`);
  console.log(`🎯 Type détecté: ${result.metadata?.detectedType}`);
  console.log(`🔍 Confiance détection: ${result.metadata?.detectionConfidence}`);
  console.log(`⏱️ Temps de traitement: ${endTime - startTime}ms`);
  console.log(`📏 Longueur originale: ${result.metadata?.originalLength} caractères\n`);
  
  if (result.error) {
    console.error(`❌ Erreur de parsing: ${result.error}\n`);
  }
  
  // Validation détaillée
  if (result.validation) {
    console.log(`🔍 Validation interne:`);
    console.log(`   Valide: ${result.validation.isValid}`);
    console.log(`   Erreurs: ${result.validation.errors.length}`);
    console.log(`   Avertissements: ${result.validation.warnings.length}\n`);
    
    if (result.validation.errors.length > 0) {
      console.log('❌ Erreurs de validation:');
      result.validation.errors.forEach(error => {
        console.log(`   - ${error.message} (${error.code})`);
      });
      console.log('');
    }
  }
  
  // Simulation validation API Notion
  console.log('🧪 Simulation validation API Notion...');
  
  let apiErrors = 0;
  let problematicBlocks = [];
  
  result.blocks.forEach((block, index) => {
    const issues = [];
    
    // Vérifier la structure de base
    const typeProperty = block[block.type];
    if (!typeProperty) {
      issues.push(`Propriété '${block.type}' manquante`);
      apiErrors++;
    }
    
    // Vérifier les children
    if ('children' in block && block.children) {
      if (!('has_children' in block) || !block.has_children) {
        issues.push('children présent mais has_children manquant/false');
        apiErrors++;
      }
    }
    
    // Vérifications spécifiques
    if (block.type === 'divider') {
      if (!block.divider || Object.keys(block.divider).length !== 0) {
        issues.push('divider mal formé');
        apiErrors++;
      }
    }
    
    if (issues.length > 0) {
      problematicBlocks.push({ index, type: block.type, issues });
    }
  });
  
  if (apiErrors === 0) {
    console.log('✅ Tous les blocs passeraient la validation API Notion!');
  } else {
    console.log(`❌ ${apiErrors} erreurs détectées qui feraient échouer l'API Notion:`);
    problematicBlocks.forEach(({ index, type, issues }) => {
      console.log(`   Bloc ${index} (${type}): ${issues.join(', ')}`);
    });
  }
  
  // Statistiques des types de blocs
  console.log('\n📈 Répartition des types de blocs:');
  const blockTypes = {};
  result.blocks.forEach(block => {
    blockTypes[block.type] = (blockTypes[block.type] || 0) + 1;
  });
  
  Object.entries(blockTypes)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  
  // Résumé final
  console.log('\n🎯 RÉSUMÉ FINAL:');
  console.log(`   ✅ Parsing: ${result.success ? 'SUCCÈS' : 'ÉCHEC'}`);
  console.log(`   📊 Blocs générés: ${result.blocks.length}`);
  console.log(`   🔍 Validation interne: ${result.validation?.isValid ? 'SUCCÈS' : 'ÉCHEC'}`);
  console.log(`   🧪 Validation API Notion: ${apiErrors === 0 ? 'SUCCÈS' : 'ÉCHEC'}`);
  console.log(`   ⏱️ Performance: ${endTime - startTime}ms`);
  
  if (result.success && result.validation?.isValid && apiErrors === 0) {
    console.log('\n🎉 TOUS LES TESTS PASSENT! Le parser est prêt pour la production.');
  } else {
    console.log('\n⚠️ Des corrections sont encore nécessaires.');
  }
  
} catch (error) {
  console.error('💥 ERREUR FATALE:', error.message);
  console.error(error.stack);
}