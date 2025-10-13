const { parseContent } = require('./dist/parseContent');

// Test simple avec du texte basique
const testContent = `# Test Heading

This is a simple paragraph.

- First item
- Second item

> This is a quote

\`\`\`javascript
console.log('Hello world');
\`\`\`
`;

console.log('Testing parseContent with simple markdown...');

try {
  const result = parseContent(testContent);
  console.log('Success:', result.success);
  console.log('Blocks count:', result.blocks.length);
  console.log('Error:', result.error);
  
  if (result.blocks.length > 0) {
    console.log('\nFirst few blocks:');
    result.blocks.slice(0, 3).forEach((block, i) => {
      console.log(`Block ${i}:`, JSON.stringify(block, null, 2));
    });
  }
  
} catch (error) {
  console.error('Exception caught:', error.message);
  console.error('Stack:', error.stack);
}