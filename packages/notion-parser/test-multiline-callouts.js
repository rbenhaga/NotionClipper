const { parseContent } = require('./dist/parseContent');

// Test avec les callouts HTML multi-lignes comme dans le document original
const multilineCalloutContent = `# Test Callouts Multi-lignes

## Section avec callouts HTML

<aside>
📝
</aside>
> Note importante avec formatage **gras** et *italique*

<aside>
ℹ️
</aside>
> Information utile avec \`code inline\`

<aside>
💡
</aside>
> Conseil pratique avec [lien](https://example.com)

<aside>
⚠️
</aside>
> Avertissement sérieux à prendre en compte

<aside>
🚨
</aside>
> Danger critique - attention maximale requise

<aside>
✅
</aside>
> Succès confirmé avec ~~ancien texte~~ remplacé

## Section normale

Texte normal après les callouts.`;

console.log('Testing multi-line HTML callouts...\n');

try {
  const result = parseContent(multilineCalloutContent);
  
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
        
        // Vérifier le formatage
        if (block.callout.rich_text.length > 1) {
          console.log(`  Rich text segments: ${block.callout.rich_text.length}`);
          block.callout.rich_text.forEach((segment, j) => {
            if (segment.annotations) {
              console.log(`    Segment ${j}: "${segment.text?.content}" - ${JSON.stringify(segment.annotations)}`);
            }
          });
        }
      } else if (block.type === 'heading_1' || block.type === 'heading_2') {
        const headingContent = block[block.type];
        console.log(`  Content: "${headingContent.rich_text[0]?.text?.content}"`);
      } else if (block.type === 'paragraph') {
        console.log(`  Content: "${block.paragraph.rich_text[0]?.text?.content}"`);
      }
    });
    
    // Compter les callouts
    const calloutCount = result.blocks.filter(b => b.type === 'callout').length;
    console.log(`\n✅ Found ${calloutCount} callouts`);
    
    if (calloutCount === 6) {
      console.log('🎉 All 6 callouts detected correctly!');
    } else {
      console.log('⚠️ Expected 6 callouts, found', calloutCount);
    }
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}