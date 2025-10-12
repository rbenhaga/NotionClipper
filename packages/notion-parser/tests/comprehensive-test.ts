/**
 * Test complet pour identifier tous les problèmes de parsing
 */

import { parseContent } from '../src/parseContent';
import type { NotionBlock } from '../src/types';

// Texte de test complet fourni par l'utilisateur
const TEST_CONTENT = `# Test COMPLET - Fonctionnalités Notion Parser v2.1

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

function validateBlock(block: NotionBlock, index: number): string[] {
  const errors: string[] = [];
  
  // Vérifier que le bloc a un type
  if (!block.type) {
    errors.push(`Bloc ${index}: Manque la propriété 'type'`);
    return errors;
  }

  // Vérifier que la propriété correspondante au type existe
  const typeProperty = block[block.type as keyof NotionBlock];
  if (!typeProperty) {
    errors.push(`Bloc ${index}: Propriété '${block.type}' manquante pour le type '${block.type}'`);
  }

  // Vérifier les propriétés children
  if ('children' in block && block.children) {
    // Si un bloc a des children, il doit avoir has_children = true
    if (!('has_children' in block) || !block.has_children) {
      errors.push(`Bloc ${index}: Bloc avec 'children' mais sans 'has_children: true'`);
    }

    // Valider récursivement les enfants
    if (Array.isArray(block.children)) {
      block.children.forEach((child, childIndex) => {
        const childErrors = validateBlock(child as NotionBlock, childIndex);
        errors.push(...childErrors.map(err => `Bloc ${index}.${childIndex}: ${err}`));
      });
    }
  }

  // Vérifications spécifiques par type
  switch (block.type) {
    case 'divider':
      if (!block.divider || typeof block.divider !== 'object') {
        errors.push(`Bloc ${index}: Divider doit avoir une propriété 'divider' objet`);
      }
      break;
      
    case 'paragraph':
      if (!block.paragraph || !block.paragraph.rich_text) {
        errors.push(`Bloc ${index}: Paragraph doit avoir 'paragraph.rich_text'`);
      }
      break;
      
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
      const heading = block[block.type as keyof NotionBlock] as any;
      if (!heading || !heading.rich_text) {
        errors.push(`Bloc ${index}: ${block.type} doit avoir '${block.type}.rich_text'`);
      }
      break;
      
    case 'bulleted_list_item':
    case 'numbered_list_item':
    case 'to_do':
      const listItem = block[block.type as keyof NotionBlock] as any;
      if (!listItem || !listItem.rich_text) {
        errors.push(`Bloc ${index}: ${block.type} doit avoir '${block.type}.rich_text'`);
      }
      break;
      
    case 'toggle':
      if (!block.toggle || !block.toggle.rich_text) {
        errors.push(`Bloc ${index}: Toggle doit avoir 'toggle.rich_text'`);
      }
      break;
      
    case 'callout':
      if (!block.callout || !block.callout.rich_text) {
        errors.push(`Bloc ${index}: Callout doit avoir 'callout.rich_text'`);
      }
      break;
      
    case 'quote':
      if (!block.quote || !block.quote.rich_text) {
        errors.push(`Bloc ${index}: Quote doit avoir 'quote.rich_text'`);
      }
      break;
      
    case 'code':
      if (!block.code || !block.code.rich_text) {
        errors.push(`Bloc ${index}: Code doit avoir 'code.rich_text'`);
      }
      break;
      
    case 'table':
      if (!block.table || !block.table.children) {
        errors.push(`Bloc ${index}: Table doit avoir 'table.children'`);
      }
      break;
  }

  return errors;
}

function runComprehensiveTest() {
  console.log('🧪 Démarrage du test complet du notion-parser...\n');
  
  try {
    const result = parseContent(TEST_CONTENT, {
      contentType: 'markdown',
      preserveFormatting: true,
      convertLinks: true,
      convertImages: true,
      skipValidation: false,
      includeValidation: true,
      includeMetadata: true
    });

    console.log(`✅ Parsing terminé avec succès: ${result.success}`);
    console.log(`📊 Nombre de blocs générés: ${result.blocks.length}`);
    console.log(`🎯 Type détecté: ${result.metadata?.detectedType}`);
    console.log(`⏱️ Temps de traitement: ${result.metadata?.processingTime}ms\n`);

    if (result.error) {
      console.error(`❌ Erreur de parsing: ${result.error}\n`);
    }

    // Validation détaillée de chaque bloc
    console.log('🔍 Validation détaillée des blocs:\n');
    
    const allErrors: string[] = [];
    
    result.blocks.forEach((block, index) => {
      const errors = validateBlock(block, index);
      if (errors.length > 0) {
        allErrors.push(...errors);
        console.log(`❌ Bloc ${index} (${block.type}):`);
        errors.forEach(error => console.log(`   - ${error}`));
        console.log(`   - JSON: ${JSON.stringify(block, null, 2).substring(0, 200)}...\n`);
      }
    });

    if (allErrors.length === 0) {
      console.log('✅ Tous les blocs sont valides!\n');
    } else {
      console.log(`❌ Total d'erreurs trouvées: ${allErrors.length}\n`);
    }

    // Analyse des types de blocs générés
    const blockTypes = result.blocks.reduce((acc, block) => {
      acc[block.type] = (acc[block.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📈 Répartition des types de blocs:');
    Object.entries(blockTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });

    // Recherche de blocs problématiques spécifiques
    console.log('\n🔍 Recherche de problèmes spécifiques:');
    
    const problematicBlocks = result.blocks.filter((block, index) => {
      // Bloc avec children mais sans propriété principale
      if ('children' in block && block.children && !block[block.type as keyof NotionBlock]) {
        console.log(`❌ Bloc ${index}: Type '${block.type}' avec children mais sans propriété '${block.type}'`);
        return true;
      }
      
      // Divider mal formé
      if (block.type === 'divider' && (!block.divider || Object.keys(block.divider).length !== 0)) {
        console.log(`❌ Bloc ${index}: Divider mal formé - doit être { type: 'divider', divider: {} }`);
        return true;
      }
      
      return false;
    });

    if (problematicBlocks.length === 0) {
      console.log('✅ Aucun problème spécifique détecté');
    }

    return {
      success: result.success,
      totalBlocks: result.blocks.length,
      errors: allErrors,
      problematicBlocks: problematicBlocks.length,
      blockTypes
    };

  } catch (error) {
    console.error('💥 Erreur fatale lors du test:', error);
    return {
      success: false,
      totalBlocks: 0,
      errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
      problematicBlocks: 0,
      blockTypes: {}
    };
  }
}

// Exécuter le test
if (require.main === module) {
  runComprehensiveTest();
}

export { runComprehensiveTest, validateBlock, TEST_CONTENT };