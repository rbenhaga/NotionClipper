/**
 * Tests d'intégration - CDC §2.3
 */

import { parseContent } from '../../src/parseContent';
import { BlockFormatter } from '../../src/formatters/BlockFormatter';
import { NotionValidator } from '../../src/validators/NotionValidator';

describe('7. Tests d\'intégration', () => {
  test('Document mixte complet', () => {
    const document = `# Rapport Technique

## Code
\`\`\`python
def main():
    return True
\`\`\`

## Données
| Metric | Value |
|--------|-------|
| CPU    | 80%   |

## Formule
La complexité est $O(n^2)$

## Ressources
- Audio: https://example.com/talk.mp3
- [Documentation](https://docs.com)

## Tâches
- [x] Implémenter
- [ ] Tester
- [ ] Déployer`;

    const result = parseContent(document, { contentType: 'markdown' });
    expect(result.success).toBe(true);

    // Vérifier présence de tous les éléments
    const types = new Set(result.blocks.map(b => b.type));
    expect(types.has('heading_1')).toBe(true);
    expect(types.has('heading_2')).toBe(true);
    expect(types.has('code')).toBe(true);
    expect(types.has('table')).toBe(true);
    expect(types.has('paragraph')).toBe(true); // Contient l'équation LaTeX inline
    expect(types.has('bulleted_list_item')).toBe(true); // Contient l'URL audio
    expect(types.has('to_do')).toBe(true);
    
    // Vérifier que l'équation LaTeX est bien parsée (inline dans paragraph)
    const paragraphWithEquation = result.blocks.find(b => 
      b.type === 'paragraph' && 
      (b as any).paragraph?.rich_text?.some((rt: any) => rt.type === 'equation')
    );
    expect(paragraphWithEquation).toBeDefined();
  });

  test('Pipeline complet avec formatage et validation', () => {
    const content = `# Document Test

Paragraph with **bold** and *italic*.

\`\`\`js
function test() { return true; }
\`\`\``;

    // 1. Parser
    const parsed = parseContent(content, { contentType: 'markdown' });
    expect(parsed.success).toBe(true);

    // 2. Formater
    const formatter = new BlockFormatter();
    const formatted = formatter.format(parsed.blocks, {
      removeEmptyBlocks: true,
      normalizeWhitespace: true,
      enforceBlockLimits: true
    });
    expect(formatted.length).toBeGreaterThan(0);

    // 3. Valider
    const validator = new NotionValidator();
    const validation = validator.validate(formatted);
    expect(validation.isValid).toBe(true);
  });
});