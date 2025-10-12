const { parseContent } = require('./dist/parseContent.js');

// Contenu de test complet (version simplifiée pour éviter les problèmes d'échappement)
const fullTestContent = `# Test COMPLET - Fonctionnalités Notion Parser v2.1

## Document de validation des fonctionnalités normales

Ce document teste toutes les fonctionnalités de parsing markdown vers Notion API.

---

## Section 1: Hiérarchie des titres

# Titre H1 - Niveau 1
## Titre H2 - Niveau 2
### Titre H3 - Niveau 3

---

## Section 2: Formatage inline (Rich Text)

Texte **en gras** pour l'emphase forte.
Texte *en italique* pour l'emphase légère.
Texte ***gras et italique*** combinés.
Texte __souligné__ avec underscores doubles.
Texte ~~barré~~ avec tildes.
Voici du \`code inline\` dans une phrase.
Voici un [lien cliquable](https://notion.so) dans le texte.

---

## Section 3: Listes à puces

- Premier élément de liste simple
- Deuxième élément avec **formatage gras**
- Troisième élément avec *italique*
  - Sous-élément niveau 2
    - Sous-élément niveau 3 (max depth)
  - Retour niveau 2
- Retour niveau 1

---

## Section 4: Listes numérotées

1. Premier élément numéroté
2. Deuxième avec **gras**
3. Troisième normal
   1. Sous-liste numérotée
   2. Deuxième sous-élément
      1. Niveau 3 maximum
   3. Retour niveau 2
4. Retour niveau principal

---

## Section 5: Listes de tâches (To-do)

- [ ] Tâche non cochée simple
- [x] Tâche terminée
- [ ] Tâche avec **formatage gras**
- [x] Tâche avec *italique* terminée

---

## Section 6: Toggle Lists (Listes déroulantes)

> Ceci est un toggle principal
> Contenu qui peut être masqué
> Supporte **gras** et *italique*

> Un autre toggle séparé
> Avec son propre contenu

---

## Section 7: Callouts (6 types)

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

## Section 8: Citations (Blockquotes)

> Citation simple sur une ligne

> Citation multi-ligne
> Deuxième ligne de la citation
> Avec **formatage** inclus

---

## Section 9: Blocs de code

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

### Code sans langage
\`\`\`
Bloc de code générique
Sans coloration syntaxique
\`\`\`

---

## Section 10: Tableaux Markdown

| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Texte     | **Gras**  | *Italique*|
| 123       | 456       | 789       |

---

## Section 11: Images

![Logo Notion](https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png)

https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png

---

## Section 12: Vidéos

https://www.youtube.com/watch?v=dQw4w9WgXcQ

---

## Section 13: Audio

https://example.com/podcast.mp3

---

## Section 14: Bookmarks

https://www.notion.so
https://github.com/makenotion/notion-sdk-js

---

## Section 15: Dividers

---

***

___

---

## Section 16: Toggle Headings

> # Toggle H1 Principal
> Contenu sous le H1 déroulant
> Avec plusieurs lignes

> ## Toggle H2 Secondaire
> Contenu du H2
> - Avec une liste
> - À puces

---

**Document de test fonctionnalités - v2.1**`;

console.log('🧪 Test complet du parser...\n');

try {
  const result = parseContent(fullTestContent, { 
    contentType: 'markdown',
    preserveFormatting: true,
    convertLinks: true,
    convertImages: true,
    skipValidation: false
  });
  
  console.log(`✅ Parsing réussi: ${result.success}`);
  console.log(`📊 Nombre de blocs: ${result.blocks.length}`);
  console.log(`🎯 Type détecté: ${result.metadata?.detectedType}`);
  console.log(`⏱️ Temps: ${result.metadata?.processingTime}ms\n`);
  
  if (result.error) {
    console.error(`❌ Erreur: ${result.error}\n`);
  }
  
  // Compter les types de blocs
  const blockTypes = {};
  let problemCount = 0;
  
  result.blocks.forEach((block, index) => {
    blockTypes[block.type] = (blockTypes[block.type] || 0) + 1;
    
    // Vérifier les problèmes
    const typeProperty = block[block.type];
    const hasChildren = 'children' in block && Array.isArray(block.children);
    const hasChildrenFlag = 'has_children' in block && block.has_children;
    
    if (!typeProperty) {
      console.log(`❌ Bloc ${index}: Propriété '${block.type}' manquante`);
      problemCount++;
    }
    
    if (hasChildren && !hasChildrenFlag) {
      console.log(`❌ Bloc ${index}: children sans has_children`);
      problemCount++;
    }
    
    if (block.type === 'divider' && (!block.divider || Object.keys(block.divider).length !== 0)) {
      console.log(`❌ Bloc ${index}: Divider mal formé`);
      problemCount++;
    }
  });
  
  console.log('📈 Répartition des types de blocs:');
  Object.entries(blockTypes)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  
  console.log(`\n🔍 Problèmes détectés: ${problemCount}`);
  
  if (problemCount === 0) {
    console.log('✅ Tous les blocs sont valides pour l\'API Notion!');
  } else {
    console.log('❌ Des corrections sont nécessaires.');
  }
  
} catch (error) {
  console.error('💥 Erreur fatale:', error.message);
  console.error(error.stack);
}