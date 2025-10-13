const { parseContent } = require('./dist/parseContent');

// Test de debug avec un seul TODO item
const singleTodoContent = `- [ ] Tâche non cochée simple`;

console.log('Testing single TODO item conversion...\n');

try {
  const result = parseContent(singleTodoContent);
  
  console.log('Success:', result.success);
  console.log('Blocks count:', result.blocks.length);
  console.log('Error:', result.error);
  
  if (result.blocks.length > 0) {
    console.log('\nBlocks:');
    result.blocks.forEach((block, i) => {
      console.log(`Block ${i}:`, JSON.stringify(block, null, 2));
    });
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}