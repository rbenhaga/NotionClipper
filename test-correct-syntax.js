const fs = require('fs');
const { parseContent } = require('./packages/notion-parser/dist/parseContent');

const markdown = fs.readFileSync('test-correct-syntax.md', 'utf-8');

console.log('=== MARKDOWN INPUT ===');
console.log(markdown);
console.log('\n=== PARSING RESULT ===');

try {
  const result = parseContent(markdown);
  console.log('Parsed blocks:', result.blocks.length);
  
  result.blocks.forEach((block, index) => {
    console.log(`\n--- Block ${index + 1} ---`);
    console.log('Type:', block.type);
    console.log('Has children:', block.has_children || false);
    
    if (block.type === 'quote') {
      console.log('Quote content:', block.quote.rich_text[0]?.text?.content);
    } else if (block.type === 'toggle') {
      console.log('Toggle content:', block.toggle.rich_text[0]?.text?.content);
    } else if (block.type.startsWith('heading_')) {
      console.log('Heading content:', block[block.type].rich_text[0]?.text?.content);
      console.log('Is toggleable:', block[block.type].is_toggleable || false);
    } else if (block.type === 'bulleted_list_item') {
      console.log('List item:', block.bulleted_list_item.rich_text[0]?.text?.content);
    } else if (block.type === 'to_do') {
      console.log('To-do:', block.to_do.rich_text[0]?.text?.content);
      console.log('Checked:', block.to_do.checked);
    }
  });
  
} catch (error) {
  console.error('Error parsing:', error.message);
  console.error(error.stack);
}