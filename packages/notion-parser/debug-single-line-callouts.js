const { Lexer } = require('./dist/lexer/Lexer');

// Test de debug pour les callouts sur une ligne
const singleLineCalloutContent = `<aside> 📝</aside>
Note importante avec formatage **gras** et *italique*

<aside> ℹ️</aside>
Information utile avec \`code inline\``;

console.log('Testing single-line HTML callouts tokenization...\n');

const lexer = new Lexer();
const tokenStream = lexer.tokenize(singleLineCalloutContent);

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