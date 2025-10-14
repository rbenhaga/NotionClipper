const fs = require('fs');
const { MarkdownParser } = require('./packages/notion-parser/dist/parsers/MarkdownParser');

const markdown = fs.readFileSync('test-children.md', 'utf-8');

console.log('=== MARKDOWN INPUT ===');
console.log(markdown);
console.log('\n=== AST PARSING ===');

const parser = new MarkdownParser();
const nodes = parser.parse(markdown);

console.log('Generated AST nodes:', nodes.length);
nodes.forEach((node, i) => {
  console.log(`\nAST Node ${i}:`);
  console.log('  Type:', node.type);
  console.log('  Content:', node.content?.substring(0, 50));
  console.log('  Children:', node.children ? node.children.length : 0);
  
  if (node.children && node.children.length > 0) {
    node.children.forEach((child, j) => {
      console.log(`    Child ${j}: ${child.type} - "${child.content?.substring(0, 30)}"`);
    });
  }
});