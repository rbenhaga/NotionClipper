const { parseContent } = require('./dist/parseContent');

// Test avec le contenu problématique original (version courte)
const problematicContent = `# Test COMPLET - Fonctionnalités Notion Parser v2.1

## ☑️ Section 5: Listes de tâches (To-do)

- [ ] Tâche non cochée simple
- [x] Tâche terminée
- [ ] Tâche avec formatage **gras**
- [x] Tâche avec *italique* terminée

## 🎨 Section 7: Callouts (6 types)

<aside> 📝</aside>
Note importante avec formatage **gras** et *italique*

<aside> ℹ️</aside>
Information utile avec \`code inline\`

<aside> 💡</aside>
Conseil pratique avec [lien](https://example.com)

<aside> ⚠️</aside>
Avertissement sérieux à prendre en compte

## 💬 Section 8: Citations (Blockquotes)

> Citation simple sur une ligne
> Citation multi-ligne
> Deuxième ligne de la citation

## 💻 Section 9: Blocs de code

\`\`\`javascript
function parseNotionBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\\n');
  for (const line of lines) {
    blocks.push(parseLine(line));
  }
  return blocks;
}
\`\`\``;

console.log('Testing FINAL with key features...\n');

try {
  const result = parseContent(problematicContent);
  
  console.log('=== RESULTS ===');
  console.log('Success:', result.success);
  console.log('Blocks count:', result.blocks.length);
  console.log('Error:', result.error);
  
  if (result.success) {
    console.log('\n=== BLOCK TYPES SUMMARY ===');
    const blockTypes = {};
    result.blocks.forEach(block => {
      blockTypes[block.type] = (blockTypes[block.type] || 0) + 1;
    });
    
    Object.entries(blockTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });
    
    console.log('\n=== VALIDATION ===');
    const hasHeadings = result.blocks.some(b => b.type.startsWith('heading_'));
    const hasTodos = result.blocks.some(b => b.type === 'to_do');
    const hasCallouts = result.blocks.some(b => b.type === 'callout');
    const hasCode = result.blocks.some(b => b.type === 'code');
    const hasQuotes = result.blocks.some(b => b.type === 'quote');
    
    console.log('✅ Headings:', hasHeadings ? 'PASS' : 'FAIL');
    console.log('✅ To-do items:', hasTodos ? 'PASS' : 'FAIL');
    console.log('✅ Callouts:', hasCallouts ? 'PASS' : 'FAIL');
    console.log('✅ Code blocks:', hasCode ? 'PASS' : 'FAIL');
    console.log('✅ Quotes:', hasQuotes ? 'PASS' : 'FAIL');
    
    const passedTests = [hasHeadings, hasTodos, hasCallouts, hasCode, hasQuotes].filter(Boolean).length;
    console.log(`\n🎯 SCORE: ${passedTests}/5 tests passed (${Math.round(passedTests/5*100)}%)`);
    
    if (passedTests === 5) {
      console.log('🎉 ALL CRITICAL FEATURES WORKING!');
    } else {
      console.log('⚠️ Some features need attention.');
      
      // Debug des premiers blocs
      console.log('\n=== DEBUG FIRST BLOCKS ===');
      result.blocks.slice(0, 10).forEach((block, i) => {
        console.log(`Block ${i}: ${block.type}`);
        
        if (block.type === 'to_do') {
          console.log(`  TODO: "${block.to_do.rich_text[0]?.text?.content}" (${block.to_do.checked})`);
        } else if (block.type === 'callout') {
          console.log(`  CALLOUT: "${block.callout.rich_text[0]?.text?.content}" (${block.callout.icon.emoji})`);
        }
      });
    }
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}