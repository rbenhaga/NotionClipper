const { Lexer } = require('./dist/lexer/Lexer');

// Test de debug pour les listes de tâches
const todoContent = `- [ ] Tâche non cochée simple
- [x] Tâche terminée
- [ ] Tâche avec formatage **gras**`;

console.log('Testing TODO items tokenization...\n');

const lexer = new Lexer();
const tokenStream = lexer.tokenize(todoContent);

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