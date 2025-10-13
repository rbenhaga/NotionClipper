const { parseContent } = require('./dist/parseContent');

// Test avec les callouts HTML comme dans le contenu original
const testContent = `# Test Callouts HTML

## Section avec callouts

<aside> 📝</aside>
Note importante avec formatage **gras** et *italique*

<aside> ℹ️</aside>
Information utile avec \`code inline\`

<aside> 💡</aside>
Conseil pratique avec [lien](https://example.com)

<aside> ⚠️</aside>
Avertissement sérieux à prendre en compte

<aside> 🚨</aside>
Danger critique - attention maximale requise

<aside> ✅</aside>
Succès confirmé avec ~~ancien texte~~ remplacé

## Section normale

Texte normal après les callouts.`;

console.log('Testing HTML callouts...\n');

try {
  const result = parseContent(testContent);
  
  console.log('Success:', result.success);
  console.log('Blocks count:', result.blocks.length);
  console.log('Error:', result.error);
  
  if (result.blocks.length > 0) {
    console.log('\nBlocks:');
    result.blocks.forEach((block, i) => {
      console.log(`\nBlock ${i}:`);
      console.log(`  Type: ${block.type}`);
      
      if (block.type === 'callout') {
        console.log(`  Icon: ${block.callout.icon.emoji}`);
        console.log(`  Color: ${block.callout.color}`);
        console.log(`  Content: "${block.callout.rich_text[0]?.text?.content}"`);
      } else if (block.type === 'heading_1' || block.type === 'heading_2') {
        const headingContent = block[block.type];
        console.log(`  Content: "${headingContent.rich_text[0]?.text?.content}"`);
      } else if (block.type === 'paragraph') {
        console.log(`  Content: "${block.paragraph.rich_text[0]?.text?.content}"`);
      }
    });
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}