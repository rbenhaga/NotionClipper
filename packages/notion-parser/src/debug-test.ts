import { parseContent } from './parseContent';

// Test avec le contenu exact du document de test
const testContent = `# Titre H1 - Niveau 1

## Titre H2 - Niveau 2

### Titre H3 - Niveau 3

Texte en **gras** pour l'emphase forte.

Texte en *italique* pour l'emphase légère.

Texte **gras et italique** combinés.

Voici du \`code inline\` dans une phrase.

Voici un [lien cliquable](https://example.com) dans le texte.

- Premier élément de liste simple
- Deuxième élément avec formatage **gras**
- Troisième élément avec *italique*
  - Sous-élément niveau 2
    - Sous-élément niveau 3 (max depth)
  - Retour niveau 2
- Retour niveau 1

1. Premier élément numéroté
2. Deuxième avec **gras**
3. Troisième normal
   1. Sous-liste numérotée
   2. Deuxième sous-élément
      1. Niveau 3 maximum
   2. Retour niveau 2
4. Retour niveau principal
5. Dernier avec \`code inline\`

- [ ] Tâche non cochée simple
- [x] Tâche terminée
- [ ] Tâche avec formatage **gras**
- [x] Tâche avec *italique* terminée
- [ ] Tâche avec \`code inline\`

<aside> 📝</aside>
Note importante avec formatage **gras** et *italique*

<aside> ℹ️</aside>
Information utile avec \`code inline\`

<aside> 💡</aside>
Conseil pratique avec [lien](https://example.com)

> Citation simple sur une ligne

> Citation multi-ligne
> Deuxième ligne de la citation
> Avec formatage **inclus**

\`\`\`javascript
function parseNotionBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\\n');
  
  for (const line of lines) {
    blocks.push(parseLine(line));
  }
  
  return blocks;
}
\`\`\`

\`\`\`python
def convert_to_notion(text):
    """Convertit markdown en blocs Notion"""
    blocks = []
    for line in text.split('\\n'):
        block = parse_line(line)
        blocks.append(block)
    return blocks
\`\`\`

$$
E = mc^2
$$

$$
\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)
$$

| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Texte | **Gras** | *Italique* |
| 123 | 456 | 789 |

![Image test](https://example.com/image.jpg)

---

Document de test fonctionnalités - v2.1`;

function debugTest() {
    console.log('🔍 DEBUG TEST - Parsing avec le nouveau système');
    console.log('='.repeat(60));
    
    console.log('\n📝 Contenu à parser (premiers 300 caractères):');
    console.log(testContent.substring(0, 300) + '...');
    console.log(`\n📊 Longueur totale: ${testContent.length} caractères`);
    
    console.log('\n🚀 Test avec useModernParser: true');
    const result = parseContent(testContent, {
        useModernParser: true,
        conversion: {
            preserveFormatting: true,
            convertLinks: true,
            convertImages: true,
            convertTables: true,
            convertCode: true
        }
    });
    
    console.log('\n📊 Résultats:');
    console.log(`  ✅ Success: ${result.success}`);
    console.log(`  📦 Blocks: ${result.blocks.length}`);
    console.log(`  ❌ Error: ${result.error || 'none'}`);
    
    if (result.metadata) {
        console.log('\n📈 Metadata:');
        console.log(`  🎯 Type détecté: ${result.metadata.detectedType}`);
        console.log(`  🎲 Confiance: ${result.metadata.confidence}`);
        console.log(`  📏 Longueur originale: ${result.metadata.originalLength}`);
        console.log(`  🧱 Nombre de blocs: ${result.metadata.blockCount}`);
        console.log(`  ⏱️ Temps de traitement: ${result.metadata.processingTime}ms`);
    }
    
    if (result.blocks.length > 0) {
        console.log('\n🧱 Types de blocs générés:');
        const blockTypes = result.blocks.reduce((acc, block) => {
            acc[block.type] = (acc[block.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        Object.entries(blockTypes).forEach(([type, count]) => {
            console.log(`  📄 ${type}: ${count}`);
        });
        
        console.log('\n🔍 Premiers blocs:');
        result.blocks.slice(0, 10).forEach((block, i) => {
            const content = getBlockContent(block);
            console.log(`  ${i + 1}. ${block.type}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
        });
    } else {
        console.log('\n❌ PROBLÈME: Aucun bloc généré !');
        console.log('   Cela indique un problème dans le parsing.');
    }
    
    return result;
}

function getBlockContent(block: any): string {
    if (block.paragraph?.rich_text?.[0]?.text?.content) {
        return block.paragraph.rich_text[0].text.content;
    }
    if (block.heading_1?.rich_text?.[0]?.text?.content) {
        return block.heading_1.rich_text[0].text.content;
    }
    if (block.heading_2?.rich_text?.[0]?.text?.content) {
        return block.heading_2.rich_text[0].text.content;
    }
    if (block.heading_3?.rich_text?.[0]?.text?.content) {
        return block.heading_3.rich_text[0].text.content;
    }
    if (block.bulleted_list_item?.rich_text?.[0]?.text?.content) {
        return block.bulleted_list_item.rich_text[0].text.content;
    }
    if (block.numbered_list_item?.rich_text?.[0]?.text?.content) {
        return block.numbered_list_item.rich_text[0].text.content;
    }
    if (block.to_do?.rich_text?.[0]?.text?.content) {
        return block.to_do.rich_text[0].text.content;
    }
    if (block.quote?.rich_text?.[0]?.text?.content) {
        return block.quote.rich_text[0].text.content;
    }
    if (block.callout?.rich_text?.[0]?.text?.content) {
        return block.callout.rich_text[0].text.content;
    }
    if (block.code?.rich_text?.[0]?.text?.content) {
        return block.code.rich_text[0].text.content;
    }
    return '';
}

// Exporter pour utilisation
export { debugTest };

// Si exécuté directement
if (require.main === module) {
    debugTest();
}