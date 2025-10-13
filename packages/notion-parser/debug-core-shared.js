// Test via core-shared comme l'application
const { parseContent } = require('../core-shared/dist/parsers');

// Test avec le contenu problématique
const testContent = `# Test COMPLET - Fonctionnalités Notion Parser v2.1
## Section 2: Formatage inline
### Titre H3
Texte normal
- [ ] Tâche non cochée
- Premier élément`;

console.log('Testing parseContent via core-shared...\n');

try {
  const result = parseContent(testContent);
  
  console.log('Success:', result.success);
  console.log('Blocks count:', result.blocks.length);
  console.log('Error:', result.error);
  
  if (result.blocks.length > 0) {
    console.log('\nFirst few blocks:');
    result.blocks.slice(0, 6).forEach((block, i) => {
      console.log(`\nBlock ${i}:`);
      console.log(`  Type: ${block.type}`);
      
      if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
        const headingContent = block[block.type];
        console.log(`  Content: "${headingContent.rich_text[0]?.text?.content}"`);
      } else if (block.type === 'paragraph') {
        console.log(`  Content: "${block.paragraph.rich_text[0]?.text?.content}"`);
      } else if (block.type === 'to_do') {
        console.log(`  Content: "${block.to_do.rich_text[0]?.text?.content}"`);
        console.log(`  Checked: ${block.to_do.checked}`);
      } else if (block.type === 'bulleted_list_item') {
        console.log(`  Content: "${block.bulleted_list_item.rich_text[0]?.text?.content}"`);
      } else {
        console.log(`  Raw:`, JSON.stringify(block, null, 2));
      }
    });
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}