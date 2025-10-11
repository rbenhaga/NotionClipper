/**
 * Exemples d'utilisation de @notion-clipper/notion-parser
 */

import { parseContent, parseMarkdown, parseCode, parseTable } from '../src';

// Exemple 1: Parsing automatique
const content1 = `
# Documentation API

Cette API permet de **gérer les utilisateurs** et leurs *données*.

## Endpoints disponibles

- \`GET /users\` - Liste des utilisateurs  
- \`POST /users\` - Créer un utilisateur

### Exemple de code

\`\`\`javascript
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John' })
});
\`\`\`

> [!warning]
> Attention aux limites de taux d'API
`;

console.log('=== Parsing automatique ===');
const blocks1 = parseContent(content1);
console.log(`Généré ${blocks1.length} blocs`);

// Exemple 2: Parsing avec options
console.log('\n=== Parsing avec options ===');
const blocks2 = parseContent(content1, {
  contentType: 'markdown',
  color: 'blue_background',
  maxBlocks: 50,
  conversion: {
    preserveFormatting: true,
    convertLinks: true,
    convertImages: true
  },
  formatting: {
    removeEmptyBlocks: true,
    normalizeWhitespace: true
  }
});
console.log(`Généré ${blocks2.length} blocs avec formatage`);

// Exemple 3: Parsing de code
console.log('\n=== Parsing de code ===');
const codeContent = `
function calculateTotal(items) {
  return items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
}

const cart = [
  { name: 'Laptop', price: 999, quantity: 1 },
  { name: 'Mouse', price: 25, quantity: 2 }
];

console.log('Total:', calculateTotal(cart));
`;

const codeBlocks = parseCode(codeContent, 'javascript');
console.log(`Code parsé en ${codeBlocks.length} bloc(s)`);

// Exemple 4: Parsing de tableau
console.log('\n=== Parsing de tableau ===');
const tableContent = `
Product,Price,Stock,Category
Laptop,999.99,15,Electronics
Mouse,24.99,50,Electronics
Keyboard,79.99,30,Electronics
Monitor,299.99,8,Electronics
`;

const tableBlocks = parseTable(tableContent, 'csv');
console.log(`Tableau parsé en ${tableBlocks.length} bloc(s)`);

// Exemple 5: Parsing avec validation
console.log('\n=== Parsing avec validation ===');
const result = parseContent(content1, {
  includeValidation: true,
  validation: {
    strictMode: false,
    validateRichText: true
  }
}) as any;

console.log(`Blocs générés: ${result.blocks.length}`);
console.log(`Validation: ${result.validation.isValid ? 'OK' : 'Erreurs détectées'}`);
console.log(`Erreurs: ${result.validation.errors.length}`);
console.log(`Avertissements: ${result.validation.warnings.length}`);
console.log(`Type détecté: ${result.metadata.detectedType} (confiance: ${result.metadata.confidence})`);
console.log(`Temps de traitement: ${result.metadata.processingTime}ms`);

// Exemple 6: URLs
console.log('\n=== Parsing d\'URLs ===');
const urlContent = `
https://example.com
https://github.com/user/repo
https://images.example.com/photo.jpg
https://videos.example.com/video.mp4
`;

const urlBlocks = parseContent(urlContent);
console.log(`URLs parsées en ${urlBlocks.length} bloc(s)`);
urlBlocks.forEach((block, i) => {
  console.log(`  ${i + 1}. Type: ${block.type}`);
});

export {
  blocks1,
  blocks2, 
  codeBlocks,
  tableBlocks,
  result,
  urlBlocks
};