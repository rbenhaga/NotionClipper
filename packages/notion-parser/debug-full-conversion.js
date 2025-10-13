const { ModernParser } = require('./dist/parsers/ModernParser');
const { NotionConverter } = require('./dist/converters/NotionConverter');

// Test de debug complet avec TODO items
const todoContent = `- [ ] Tâche non cochée simple
- [x] Tâche terminée
- [ ] Tâche avec formatage **gras**`;

console.log('Testing full conversion with TODO items...\n');

try {
  // Étape 1: Parser vers AST
  const parser = new ModernParser();
  const ast = parser.parse(todoContent);
  
  console.log(`Generated ${ast.length} AST nodes`);
  
  // Étape 2: Convertir AST vers blocs Notion
  const converter = new NotionConverter();
  const blocks = converter.convert(ast);
  
  console.log(`\nConverted to ${blocks.length} Notion blocks:`);
  
  blocks.forEach((block, i) => {
    console.log(`\nBlock ${i}:`);
    console.log(`  Type: ${block.type}`);
    
    if (block.type === 'to_do') {
      console.log(`  Content: "${block.to_do.rich_text[0]?.text?.content}"`);
      console.log(`  Checked: ${block.to_do.checked}`);
    } else if (block.type === 'bulleted_list_item') {
      console.log(`  Content: "${block.bulleted_list_item.rich_text[0]?.text?.content}"`);
    } else if (block.type === 'numbered_list_item') {
      console.log(`  Content: "${block.numbered_list_item.rich_text[0]?.text?.content}"`);
    } else {
      console.log(`  Raw block:`, JSON.stringify(block, null, 2));
    }
  });
  
  // Compter les to_do
  const todoCount = blocks.filter(b => b.type === 'to_do').length;
  console.log(`\n✅ Found ${todoCount} to_do items`);
  
  if (todoCount === 3) {
    console.log('🎉 All 3 TODO items converted correctly!');
  } else {
    console.log('⚠️ Expected 3 TODO items, found', todoCount);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}