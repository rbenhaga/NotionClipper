import { parseContent } from './parseContent';

// Test simple pour vérifier le formatage inline
const simpleTest = `Texte en **gras** pour l'emphase forte.

Texte en *italique* pour l'emphase légère.

Voici du \`code inline\` dans une phrase.`;

function detailedTest() {
    console.log('🔍 TEST DÉTAILLÉ - Vérification du formatage inline');
    console.log('='.repeat(60));
    
    const result = parseContent(simpleTest, {
        useModernParser: true,
        conversion: {
            preserveFormatting: true,
            convertLinks: true,
            convertImages: true,
            convertTables: true,
            convertCode: true
        }
    });
    
    console.log(`\n✅ Success: ${result.success}`);
    console.log(`📦 Blocks: ${result.blocks.length}`);
    
    if (result.blocks.length > 0) {
        console.log('\n🔍 Analyse détaillée des blocs:');
        
        result.blocks.forEach((block, i) => {
            console.log(`\n📄 Bloc ${i + 1}: ${block.type}`);
            
            if ((block as any).paragraph?.rich_text) {
                console.log('  Rich text segments:');
                (block as any).paragraph.rich_text.forEach((segment: any, j: number) => {
                    console.log(`    ${j + 1}. "${segment.text?.content || ''}" - Annotations:`, segment.annotations);
                });
            }
            
            if ((block as any).heading_1?.rich_text) {
                console.log('  Rich text segments:');
                (block as any).heading_1.rich_text.forEach((segment: any, j: number) => {
                    console.log(`    ${j + 1}. "${segment.text?.content || ''}" - Annotations:`, segment.annotations);
                });
            }
        });
    }
    
    return result;
}

// Exporter pour utilisation
export { detailedTest };

// Si exécuté directement
if (require.main === module) {
    detailedTest();
}