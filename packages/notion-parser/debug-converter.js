const { ModernParser } = require('./dist/parsers/ModernParser');
const { NotionConverter } = require('./dist/converters/NotionConverter');

// Test de debug du NotionConverter
const testContent = `# Test COMPLET - Fonctionnalités Notion Parser v2.1
## Section 2: Formatage inline
### Titre H3
Texte normal
- [ ] Tâche non cochée
- Premier élément`;

console.log('Testing NotionConverter...\n');

try {
  // Étape 1: Parser vers AST
  const parser = new ModernParser();
  const ast = parser.parse(testContent);
  
  console.log(`Generated ${ast.length} AST nodes`);
  
  // Étape 2: Convertir AST vers blocs Notion
  const converter = new NotionConverter();
  const blocks = converter.convert(ast);
  
  console.log(`\nConverted to ${blocks.length} Notion blocks:`);
  
  blocks.forEach((block, i) => {
    console.log(`\nBlock ${i}:`);
    console.log(`  Type: ${block.type}`);
    
    if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
      const headingContent = block[block.type];
      console.log(`  Content: "${headingContent.rich_text[0]?.text?.content}"`);
      console.log(`  Is toggleable: ${headingContent.is_toggleable}`);
    } else if (block.type === 'paragraph') {
      console.log(`  Content: "${block.paragraph.rich_text[0]?.text?.content}"`);
    } else if (block.type === 'to_do') {
      console.log(`  Content: "${block.to_do.rich_text[0]?.text?.content}"`);
      console.log(`  Checked: ${block.to_do.checked}`);
    } else if (block.type === 'bulleted_list_item') {
      console.log(`  Content: "${block.bulleted_list_item.rich_text[0]?.text?.content}"`);
    } else {
      console.log(`  Raw block:`, JSON.stringify(block, null, 2));
    }
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}