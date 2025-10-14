const { MarkdownParser } = require('./packages/notion-parser/dist/parsers/MarkdownParser');
const { NotionConverter } = require('./packages/notion-parser/dist/converters/NotionConverter');

const testMarkdown = `> Toggle parent
>
> - Enfant 1
> - Enfant 2`;

console.log('=== MARKDOWN INPUT ===');
console.log(testMarkdown);

// Parse AST
const parser = new MarkdownParser();
const nodes = parser.parse(testMarkdown);

console.log('\n=== AST NODES ===');
nodes.forEach((node, i) => {
  console.log(`Node ${i}:`);
  console.log('  Type:', node.type);
  console.log('  Content:', node.content);
  console.log('  Children:', node.children ? node.children.length : 0);
});

// Convert to Notion
const converter = new NotionConverter();
const blocks = converter.convert(nodes);

console.log('\n=== NOTION BLOCKS ===');
blocks.forEach((block, i) => {
  console.log(`Block ${i}:`);
  console.log('  Type:', block.type);
  console.log('  Has children:', block.has_children || false);
  
  if (block.type === 'toggle') {
    console.log('  Toggle content:', block.toggle.rich_text[0]?.text?.content);
  } else if (block.type === 'quote') {
    console.log('  Quote content:', block.quote.rich_text[0]?.text?.content);
  }
});