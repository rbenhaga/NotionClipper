const { Lexer } = require('./dist/lexer/Lexer');

// Test de debug du lexer
const testLines = [
  '# Test COMPLET - Fonctionnalités Notion Parser v2.1',
  '## Section 2: Formatage inline',
  '### Titre H3',
  'Texte normal',
  '- [ ] Tâche non cochée',
  '- Premier élément',
  '1. Premier numéroté',
  '> Citation simple',
  '> [!note]',
  '> Note importante'
];

console.log('Testing Lexer with individual lines...\n');

const lexer = new Lexer({
  preserveWhitespace: false,
  trackPositions: true,
  enableInlineFormatting: true,
  enableMediaDetection: true
});

testLines.forEach((line, i) => {
  console.log(`\n=== Test ${i + 1}: "${line}" ===`);
  
  try {
    const tokenStream = lexer.tokenize(line);
    const tokens = [];
    
    while (tokenStream.hasNext()) {
      const token = tokenStream.next();
      if (token && token.type !== 'EOF') {
        tokens.push(token);
      }
    }
    
    if (tokens.length === 0) {
      console.log('❌ No tokens generated');
    } else {
      tokens.forEach((token, j) => {
        console.log(`Token ${j}: ${token.type} = "${token.content}"`);
        if (token.metadata) {
          console.log(`  Metadata:`, token.metadata);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
});

// Test avec le contenu complet
console.log('\n\n=== Testing with full content ===');
const fullContent = `# Test COMPLET
## Section 2
### Titre H3
Texte normal
- [ ] Tâche
- Premier élément`;

try {
  const tokenStream = lexer.tokenize(fullContent);
  const tokens = [];
  
  while (tokenStream.hasNext()) {
    const token = tokenStream.next();
    if (token && token.type !== 'EOF') {
      tokens.push(token);
    }
  }
  
  console.log(`Generated ${tokens.length} tokens:`);
  tokens.forEach((token, i) => {
    console.log(`${i}: ${token.type} = "${token.content}"`);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
}