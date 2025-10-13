const { ModernParser } = require('./dist/parsers/ModernParser');
const { NotionConverter } = require('./dist/converters/NotionConverter');

// Test de debug détaillé
const todoContent = `- [ ] Tâche non cochée simple`;

console.log('Testing detailed conversion...\n');

try {
  // Étape 1: Parser vers AST
  const parser = new ModernParser();
  const ast = parser.parse(todoContent);
  
  console.log('AST generated:');
  console.log(JSON.stringify(ast, null, 2));
  
  // Étape 2: Convertir manuellement le premier enfant
  if (ast.length > 0 && ast[0].children && ast[0].children.length > 0) {
    const firstChild = ast[0].children[0];
    console.log('\nFirst child:');
    console.log(JSON.stringify(firstChild, null, 2));
    
    // Tester la conversion directe
    const converter = new NotionConverter();
    
    // Simuler convertNode directement
    console.log('\nTesting convertNode directly...');
    const testBlock = converter.convertNode ? converter.convertNode(firstChild, {}) : null;
    console.log('Direct conversion result:', testBlock);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}