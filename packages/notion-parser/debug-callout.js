const { Lexer } = require('./dist/lexer/Lexer');

// Test de debug du lexer pour les callouts HTML
const testContent = `<aside> 📝</aside>
Note importante avec formatage **gras** et *italique*`;

console.log('Testing Lexer with HTML callout...\n');

const lexer = new Lexer();
const tokenStream = lexer.tokenize(testContent);

console.log('Tokens generated:');
const tokens = [];
while (tokenStream.hasNext()) {
  const token = tokenStream.next();
  if (token && token.type !== 'EOF') {
    tokens.push(token);
    console.log(`${token.type}: "${token.content}"`);
    if (token.metadata) {
      console.log(`  Metadata:`, token.metadata);
    }
  }
}

console.log(`\nTotal tokens: ${tokens.length}`);