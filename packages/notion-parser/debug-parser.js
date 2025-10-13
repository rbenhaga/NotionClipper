const { ModernParser } = require('./dist/parsers/ModernParser');

// Test de debug du ModernParser
const testContent = `# Test COMPLET - Fonctionnalités Notion Parser v2.1
## Section 2: Formatage inline
### Titre H3
Texte normal
- [ ] Tâche non cochée
- Premier élément`;

console.log('Testing ModernParser...\n');

try {
  const parser = new ModernParser();
  const ast = parser.parse(testContent);
  
  console.log(`Generated ${ast.length} AST nodes:`);
  
  ast.forEach((node, i) => {
    console.log(`\nNode ${i}:`);
    console.log(`  Type: ${node.type}`);
    console.log(`  Content: "${node.content}"`);
    if (node.metadata) {
      console.log(`  Metadata:`, node.metadata);
    }
    if (node.children && node.children.length > 0) {
      console.log(`  Children: ${node.children.length}`);
    }
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}