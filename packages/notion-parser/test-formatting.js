const { RichTextBuilder } = require('./dist/converters/RichTextBuilder');

// Test du formatage imbriqué
const testCases = [
  'Texte **gras et *italique* combinés**.',
  'Texte ***gras et italique*** ensemble.',
  'Code `inline` dans du texte.',
  'Lien [Google](https://google.com) dans du texte.',
  'Texte ~~barré~~ et __souligné__.'
];

console.log('Testing RichTextBuilder formatting...\n');

testCases.forEach((test, i) => {
  console.log(`Test ${i + 1}: "${test}"`);
  try {
    const result = RichTextBuilder.fromMarkdown(test);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('---\n');
});