// Test de la correction gras+italique
const { parseContent } = require('./packages/core-shared/dist/parsers/index.js');

console.log('🧪 Test du gras+italique corrigé...');

const testContent = `Texte **en gras** normal.
Texte *en italique* normal.
Texte ***gras et italique*** combinés.
Texte avec **gras** et *italique* séparés.
Voici du \`code inline\` dans une phrase.
Voici un [lien cliquable](https://example.com) normal.`;

const result = parseContent(testContent, {
    contentType: 'markdown',
    conversion: {
        preserveFormatting: true,
        convertLinks: true
    }
});

console.log('\nRésultat:', result.success ? `${result.blocks.length} blocs` : 'Échec');

if (result.success && result.blocks.length > 0) {
    result.blocks.forEach((block, i) => {
        if (block.type === 'paragraph' && block.paragraph) {
            console.log(`\nBloc ${i + 1}:`);
            block.paragraph.rich_text.forEach((rt, j) => {
                if (rt.type === 'text') {
                    const annotations = rt.annotations || {};
                    const formats = [];
                    if (annotations.bold) formats.push('GRAS');
                    if (annotations.italic) formats.push('ITALIQUE');
                    if (annotations.code) formats.push('CODE');

                    console.log(`  ${j + 1}. "${rt.text.content}" ${formats.length > 0 ? `[${formats.join(', ')}]` : ''}`);
                    if (rt.text.link) {
                        console.log(`      → Lien: ${rt.text.link.url}`);
                    }
                } else if (rt.type === 'equation') {
                    console.log(`  ${j + 1}. ÉQUATION: ${rt.equation.expression}`);
                }
            });
        }
    });
}

console.log('\n✅ Test terminé');