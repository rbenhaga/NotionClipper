const { ModernParser } = require('./dist/parsers/ModernParser');

// Test de debug du ModernParser avec TODO items
const todoContent = `- [ ] Tâche non cochée simple
- [x] Tâche terminée
- [ ] Tâche avec formatage **gras**`;

console.log('Testing ModernParser with TODO items...\n');

try {
  const parser = new ModernParser();
  const ast = parser.parse(todoContent);
  
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
      node.children.forEach((child, j) => {
        console.log(`    Child ${j}: ${child.type} - "${child.content}"`);
      });
    }
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}