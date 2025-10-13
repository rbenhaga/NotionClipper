import { ModernParser } from './parsers/ModernParser';
import { NotionConverter } from './converters/NotionConverter';

// Test du contenu complet
const testContent = `# Titre H1 - Niveau 1

## Titre H2 - Niveau 2

### Titre H3 - Niveau 3

Texte en **gras** pour l'emphase forte.

Texte en *italique* pour l'emphase légère.

Voici du \`code inline\` dans une phrase.

- Premier élément de liste simple
- Deuxième élément avec formatage **gras**
  - Sous-élément niveau 2
    - Sous-élément niveau 3 (max depth)

1. Premier élément numéroté
2. Deuxième avec **gras**
   1. Sous-liste numérotée
   2. Deuxième sous-élément

- [ ] Tâche non cochée simple
- [x] Tâche terminée
- [ ] Tâche avec formatage **gras**

<aside> 📝</aside>
Note importante avec formatage **gras** et *italique*

<aside> ℹ️</aside>
Information utile avec \`code inline\`

> Citation simple sur une ligne
> Citation multi-ligne
> Deuxième ligne de la citation

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

function testParser() {
    console.log('🧪 Test du ModernParser avec SimpleLexer');
    
    const parser = new ModernParser();
    const converter = new NotionConverter();
    
    console.log('\n📝 Contenu à parser:');
    console.log(testContent.substring(0, 200) + '...');
    
    console.log('\n🔍 Parsing en AST...');
    const ast = parser.parse(testContent);
    
    console.log(`✅ AST généré: ${ast.length} nodes`);
    ast.forEach((node, i) => {
        console.log(`  ${i + 1}. ${node.type}: "${node.content?.substring(0, 50) || ''}${node.content && node.content.length > 50 ? '...' : ''}"`);
    });
    
    console.log('\n🔄 Conversion en blocs Notion...');
    const blocks = converter.convert(ast);
    
    console.log(`✅ Blocs Notion générés: ${blocks.length} blocs`);
    blocks.forEach((block, i) => {
        console.log(`  ${i + 1}. ${block.type}`);
    });
    
    console.log('\n📊 Statistiques:');
    const stats = parser.getStats(testContent);
    console.log(`  - Tokens: ${stats.lexer.totalTokens}`);
    console.log(`  - Nodes AST: ${stats.parsing.totalNodes}`);
    console.log(`  - Types de tokens:`, Object.keys(stats.lexer.tokenTypes).join(', '));
    console.log(`  - Types de nodes:`, Object.keys(stats.parsing.nodeTypes).join(', '));
    
    return { ast, blocks, stats };
}

// Exporter pour utilisation
export { testParser };

// Si exécuté directement
if (require.main === module) {
    testParser();
}