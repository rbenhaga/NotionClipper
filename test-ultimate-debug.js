/**
 * TEST ULTIME - Debug complet du parsing Markdown
 */

const { parseContent } = require('./packages/notion-parser/dist/index.js');

const testMarkdown = `# Titre H1
## Titre H2
### Titre H3

Paragraphe avec **gras**, *italique*, \`code\`, [lien](https://notion.so).

- Liste 1
- Liste 2
- Liste 3

1. Numérotée 1
2. Numérotée 2

- [ ] Todo non fait
- [x] Todo fait

\`\`\`javascript
function test() {
  console.log("Hello");
}
\`\`\`

| Col1 | Col2 |
|------|------|
| A    | B    |

![Image](https://via.placeholder.com/150)

---`;

console.log('🧪 TEST ULTIME - Parsing Markdown Complet\n');
console.log('📝 Input length:', testMarkdown.length);
console.log('📝 Input preview:', testMarkdown.substring(0, 100) + '...\n');

// Test avec les options exactes utilisées par l'application
const result = parseContent(testMarkdown, {
  contentType: 'auto',
  conversion: { 
    preserveFormatting: true,
    convertLinks: true,
    convertImages: true,
    convertTables: true,
    convertCode: true
  },
  formatting: {
    removeEmptyBlocks: true,
    normalizeWhitespace: true,
    trimRichText: true
  },
  validation: {
    strictMode: false,
    validateRichText: true,
    validateBlockStructure: true
  },
  includeValidation: true,
  includeMetadata: true
});

console.log('🎯 RÉSULTATS GLOBAUX');
console.log('Detected type:', result.metadata?.detectedType);
console.log('Confidence:', result.metadata?.confidence);
console.log('Blocks count:', result.blocks?.length);
console.log('Success:', result.success || (Array.isArray(result) ? 'true (array)' : 'false'));
console.log('Has validation:', !!result.validation);
console.log('Has errors:', !!result.errors);
console.log('');

// Analyse détaillée de chaque bloc
console.log('📊 ANALYSE DÉTAILLÉE DES BLOCS\n');

const blocks = Array.isArray(result) ? result : result.blocks;

blocks?.forEach((block, i) => {
  console.log(`--- BLOC ${i}: ${block.type} ---`);
  
  switch (block.type) {
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
      console.log('✅ TITRE:', block[block.type].rich_text[0]?.text?.content);
      console.log('   Formatage:', JSON.stringify(block[block.type].rich_text[0]?.annotations || {}));
      break;
      
    case 'paragraph':
      console.log('✅ PARAGRAPHE:');
      block.paragraph.rich_text.forEach((rt, j) => {
        console.log(`   Segment ${j}:`, JSON.stringify(rt.text?.content));
        if (rt.annotations && Object.keys(rt.annotations).length > 0) {
          console.log(`   Annotations:`, JSON.stringify(rt.annotations));
        }
        if (rt.text?.link) {
          console.log(`   Link:`, rt.text.link.url);
        }
      });
      break;
      
    case 'bulleted_list_item':
      console.log('✅ LISTE À PUCES:', block.bulleted_list_item.rich_text[0]?.text?.content);
      break;
      
    case 'numbered_list_item':
      console.log('✅ LISTE NUMÉROTÉE:', block.numbered_list_item.rich_text[0]?.text?.content);
      break;
      
    case 'to_do':
      console.log('✅ TODO:', block.to_do.rich_text[0]?.text?.content);
      console.log('   Checked:', block.to_do.checked);
      break;
      
    case 'code':
      console.log('✅ CODE:');
      console.log('   Language:', block.code.language);
      console.log('   Content preview:', block.code.rich_text[0]?.text?.content?.substring(0, 50) + '...');
      break;
      
    case 'table':
      console.log('✅ TABLE:');
      console.log('   Width:', block.table.table_width);
      console.log('   Has column header:', block.table.has_column_header);
      console.log('   Has row header:', block.table.has_row_header);
      break;
      
    case 'image':
      console.log('✅ IMAGE:');
      console.log('   URL:', block.image.external?.url || block.image.file?.url);
      console.log('   Caption:', block.image.caption?.[0]?.text?.content || 'none');
      break;
      
    case 'divider':
      console.log('✅ DIVIDER');
      break;
      
    default:
      console.log('❓ UNKNOWN TYPE:', block.type);
      console.log('   Content:', JSON.stringify(block, null, 2));
  }
  
  console.log('');
});

// Test spécifique du formatage rich text
console.log('🔍 TEST SPÉCIFIQUE - Rich Text Formatage\n');

const richTextTest = 'Texte avec **gras**, *italique*, `code`, [lien](https://notion.so).';
const richResult = parseContent(richTextTest, {
  contentType: 'markdown',
  conversion: { preserveFormatting: true }
});

const richBlocks = Array.isArray(richResult) ? richResult : richResult.blocks;
const richText = richBlocks[0]?.paragraph?.rich_text || [];

console.log('Rich text segments:', richText.length);
richText.forEach((segment, i) => {
  console.log(`Segment ${i}:`);
  console.log('  Content:', JSON.stringify(segment.text?.content));
  console.log('  Annotations:', JSON.stringify(segment.annotations || {}));
  console.log('  Link:', segment.text?.link?.url || 'none');
  console.log('');
});

// Validation finale
console.log('🎯 VALIDATION FINALE\n');

const expectedBlocks = {
  'heading_1': 1,
  'heading_2': 1, 
  'heading_3': 1,
  'paragraph': 1,
  'bulleted_list_item': 3,
  'numbered_list_item': 2,
  'to_do': 2,
  'code': 1,
  'table': 1,
  'image': 1,
  'divider': 1
};

const actualCounts = {};
blocks?.forEach(block => {
  actualCounts[block.type] = (actualCounts[block.type] || 0) + 1;
});

console.log('Expected vs Actual:');
Object.keys(expectedBlocks).forEach(type => {
  const expected = expectedBlocks[type];
  const actual = actualCounts[type] || 0;
  const status = actual === expected ? '✅' : '❌';
  console.log(`${status} ${type}: ${actual}/${expected}`);
});

console.log('\n🎯 RÉSUMÉ FINAL');
const totalExpected = Object.values(expectedBlocks).reduce((a, b) => a + b, 0);
const totalActual = blocks?.length || 0;
console.log(`Total blocks: ${totalActual}/${totalExpected}`);

if (totalActual === totalExpected) {
  console.log('🎉 PARSING PARFAIT !');
} else {
  console.log('❌ Problèmes détectés');
}

console.log('\n✅ Test ultime terminé');