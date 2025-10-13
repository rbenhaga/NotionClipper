const { parseContent } = require('./dist/parseContent');

// Test avec le contenu complet fourni
const fullTestContent = `# Test COMPLET - Fonctionnalités Notion Parser v2.1

Document de validation des fonctionnalités normales

Ce document teste toutes les fonctionnalités de parsing markdown vers Notion API.

## 📝 Section 1: Hiérarchie des titres

### Titre H3 - Niveau 3

## ✨ Section 2: Formatage inline (Rich Text)

Texte en **gras** pour l'emphase forte.
Texte en *italique* pour l'emphase légère.
Texte **gras et *italique* combinés**.
Texte ~~barré~~ avec tildes.
Voici du \`code inline\` dans une phrase.
Voici un [lien cliquable](https://example.com) dans le texte.
Combinaison: **gras avec \`code\` et [lien](https://example.com)** dans la même portion.

## 📋 Section 3: Listes à puces

- Premier élément de liste simple
- Deuxième élément avec formatage **gras**
- Troisième élément avec *italique*
  - Sous-élément niveau 2
    - Sous-élément niveau 3 (max depth)
  - Retour niveau 2
- Retour niveau 1

## 🔢 Section 4: Listes numérotées

1. Premier élément numéroté
2. Deuxième avec **gras**
3. Troisième normal
   1. Sous-liste numérotée
   2. Deuxième sous-élément
      1. Niveau 3 maximum
   2. Retour niveau 2
4. Retour niveau principal
5. Dernier avec \`code inline\`

## ☑️ Section 5: Listes de tâches (To-do)

- [ ] Tâche non cochée simple
- [x] Tâche terminée
- [ ] Tâche avec formatage **gras**
- [x] Tâche avec *italique* terminée
- [ ] Tâche avec \`code inline\`
- [x] Tâche avec [lien](https://example.com)

## 🎨 Section 7: Callouts (6 types)

> [!note]
> Note importante avec formatage **gras** et *italique*

> [!info]
> Information utile avec \`code inline\`

> [!tip]
> Conseil pratique avec [lien](https://example.com)

> [!warning]
> Avertissement sérieux à prendre en compte

> [!danger]
> Danger critique - attention maximale requise

> [!success]
> Succès confirmé avec ~~ancien texte~~ remplacé

## 💬 Section 8: Citations (Blockquotes)

> Citation simple sur une ligne
> Citation multi-ligne
> Deuxième ligne de la citation
> Avec formatage **inclus**

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

## 🧮 Section 10: Équations LaTeX

### Équations inline
L'énergie est $E = mc^2$ selon Einstein.
Le théorème de Pythagore: $a^2 + b^2 = c^2$.

### Équations en bloc
$$
\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)
$$

$$
\\frac{d}{dx} \\left( \\int_{a}^{x} f(t) \\, dt \\right) = f(x)
$$

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

## 📊 Section 11: Tableaux Markdown

| Colonne 1 | Colonne 2 | Colonne 3 | Colonne 4 |
|-----------|-----------|-----------|-----------|
| Texte | **Gras** | *Italique*| \`Code\` |
| 123 | 456 | 789 | 000 |
| [Lien](https://example.com) | A | B | C |

## 🖼️ Section 14: Images

![Image test](https://example.com/image.jpg)

## 🎥 Section 15: Vidéos

### YouTube
https://www.youtube.com/watch?v=dQw4w9WgXcQ

### Vimeo
https://vimeo.com/148751763

## 🔗 Section 17: Bookmarks (Liens enrichis)

https://www.notion.so
https://github.com/makenotion/notion-sdk-js
https://stackoverflow.com/questions/123456

## 📐 Section 23: Dividers (Séparateurs)

Ligne horizontale avec 3 tirets:

---

Ligne avec 3 astérisques:

***

Ligne avec 3 underscores:

___

## 🏗️ Section 22: Toggle Headings (Titres déroulants)

> # Toggle H1 Principal
> Contenu sous le H1 déroulant
> Avec plusieurs lignes
> Et du formatage **gras**

> ## Toggle H2 Secondaire
> Contenu du H2
> Avec une liste:
> - À puces
> - Avec items

> ### Toggle H3 Tertiaire
> Contenu du H3
> Avec liste numérotée:
> 1. Premier
> 2. Deuxième

## ✅ Checklist de validation

Si le parsing est correct, tous ces éléments doivent être présents:

- [x] Titres H1, H2, H3 correctement hiérarchisés
- [x] Formatage: gras, italique, barré, souligné, code
- [x] Listes: puces, numérotées, checkboxes
- [x] Toggle headings
- [x] Callouts: 6 types différents
- [x] Citations (blockquotes)
- [x] Code: 3+ langages avec coloration
- [x] LaTeX: inline ($) et bloc ($$)
- [x] Tableaux: Markdown
- [x] Médias: Images, Vidéos
- [x] Liens: simples, bookmarks
- [x] Dividers (---)
- [x] Imbrications complexes

Document de test fonctionnalités - v2.1
Conforme au Cahier des Charges Notion Parser`;

console.log('Testing parseContent with FULL test content...');
console.log('Content length:', fullTestContent.length, 'characters');

try {
  const startTime = Date.now();
  const result = parseContent(fullTestContent);
  const endTime = Date.now();
  
  console.log('\n=== RESULTS ===');
  console.log('Success:', result.success);
  console.log('Blocks count:', result.blocks.length);
  console.log('Processing time:', endTime - startTime, 'ms');
  console.log('Error:', result.error);
  console.log('Metadata:', result.metadata);
  
  if (result.success) {
    console.log('\n=== BLOCK TYPES SUMMARY ===');
    const blockTypes = {};
    result.blocks.forEach(block => {
      blockTypes[block.type] = (blockTypes[block.type] || 0) + 1;
    });
    
    Object.entries(blockTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });
    
    console.log('\n=== VALIDATION ===');
    const hasHeadings = result.blocks.some(b => b.type.startsWith('heading_'));
    const hasLists = result.blocks.some(b => b.type.includes('list_item') || b.type === 'to_do');
    const hasCallouts = result.blocks.some(b => b.type === 'callout');
    const hasCode = result.blocks.some(b => b.type === 'code');
    const hasEquations = result.blocks.some(b => b.type === 'equation');
    const hasTables = result.blocks.some(b => b.type === 'table');
    const hasQuotes = result.blocks.some(b => b.type === 'quote');
    const hasDividers = result.blocks.some(b => b.type === 'divider');
    const hasImages = result.blocks.some(b => b.type === 'image');
    const hasVideos = result.blocks.some(b => b.type === 'video');
    const hasBookmarks = result.blocks.some(b => b.type === 'bookmark');
    
    console.log('✅ Headings:', hasHeadings ? 'PASS' : 'FAIL');
    console.log('✅ Lists:', hasLists ? 'PASS' : 'FAIL');
    console.log('✅ Callouts:', hasCallouts ? 'PASS' : 'FAIL');
    console.log('✅ Code blocks:', hasCode ? 'PASS' : 'FAIL');
    console.log('✅ Equations:', hasEquations ? 'PASS' : 'FAIL');
    console.log('✅ Tables:', hasTables ? 'PASS' : 'FAIL');
    console.log('✅ Quotes:', hasQuotes ? 'PASS' : 'FAIL');
    console.log('✅ Dividers:', hasDividers ? 'PASS' : 'FAIL');
    console.log('✅ Images:', hasImages ? 'PASS' : 'FAIL');
    console.log('✅ Videos:', hasVideos ? 'PASS' : 'FAIL');
    console.log('✅ Bookmarks:', hasBookmarks ? 'PASS' : 'FAIL');
    
    const totalFeatures = 11;
    const passedFeatures = [hasHeadings, hasLists, hasCallouts, hasCode, hasEquations, hasTables, hasQuotes, hasDividers, hasImages, hasVideos, hasBookmarks].filter(Boolean).length;
    
    console.log(`\n🎯 SCORE: ${passedFeatures}/${totalFeatures} features working (${Math.round(passedFeatures/totalFeatures*100)}%)`);
    
    if (passedFeatures === totalFeatures) {
      console.log('🎉 ALL FEATURES WORKING! Parser is ready for production.');
    } else {
      console.log('⚠️  Some features need attention.');
    }
  }
  
} catch (error) {
  console.error('Exception caught:', error.message);
  console.error('Stack:', error.stack);
}