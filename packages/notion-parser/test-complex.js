const { parseContent } = require('./dist/parseContent');

// Test avec le contenu complexe fourni
const complexContent = `# Test COMPLET - Fonctionnalités Notion Parser v2.1

## 📝 Section 1: Hiérarchie des titres

### Titre H3 - Niveau 3

## ✨ Section 2: Formatage inline (Rich Text)

Texte en **gras** pour l'emphase forte.
Texte en *italique* pour l'emphase légère.
Texte **gras et *italique* combinés**.
Texte ~~barré~~ avec tildes.
Voici du \`code inline\` dans une phrase.

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
   3. Retour niveau 2
4. Retour niveau principal

## ☑️ Section 5: Listes de tâches (To-do)

- [ ] Tâche non cochée simple
- [x] Tâche terminée
- [ ] Tâche avec formatage **gras**
- [x] Tâche avec *italique* terminée

## 💬 Section 8: Citations (Blockquotes)

> Citation simple sur une ligne
> Citation multi-ligne
> Deuxième ligne de la citation

## 💻 Section 9: Blocs de code

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

## 📐 Section 23: Dividers (Séparateurs)

Ligne horizontale avec 3 tirets:

---

Ligne avec 3 astérisques:

***

Ligne avec 3 underscores:

___
`;

console.log('Testing parseContent with complex markdown...');

try {
  const result = parseContent(complexContent);
  console.log('Success:', result.success);
  console.log('Blocks count:', result.blocks.length);
  console.log('Error:', result.error);
  console.log('Metadata:', result.metadata);
  
  if (result.blocks.length > 0) {
    console.log('\nAll blocks:');
    result.blocks.forEach((block, i) => {
      console.log(`Block ${i} (${block.type}):`, JSON.stringify(block, null, 2));
    });
  }
  
} catch (error) {
  console.error('Exception caught:', error.message);
  console.error('Stack:', error.stack);
}