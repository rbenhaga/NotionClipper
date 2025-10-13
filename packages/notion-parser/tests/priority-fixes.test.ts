import { parseContent } from '../src/parseContent';
import type { NotionRichText } from '../src/types/notion';

describe('Priority Fixes Validation', () => {
  describe('Fix #1: Formatage Inline - Espacement', () => {
    test('Bold avec espaces', () => {
      const input = 'Texte **en gras** pour test';
      const result = parseContent(input);
      
      expect(result.success).toBe(true);
      const block = result.blocks[0] as any;
      const richText = block.paragraph?.rich_text as NotionRichText[];
      
      // Vérifier le texte complet
      const fullText = richText.map((rt: NotionRichText) => rt.text?.content || '').join('');
      expect(fullText).toBe('Texte en gras pour test');
      
      // Vérifier qu'il n'y a pas de ** résiduels
      expect(fullText).not.toContain('**');
      
      // Vérifier qu'il y a bien un segment bold
      const boldSegment = richText.find((rt: NotionRichText) => rt.annotations?.bold);
      expect(boldSegment).toBeDefined();
      expect(boldSegment?.text?.content).toBe('en gras');
    });

    test('Italic avec espaces', () => {
      const input = 'Texte *en italique* normal';
      const result = parseContent(input);
      
      const block = result.blocks[0] as any;
      const richText = block.paragraph?.rich_text as NotionRichText[];
      const fullText = richText.map((rt: NotionRichText) => rt.text?.content || '').join('');
      
      expect(fullText).toBe('Texte en italique normal');
      expect(fullText).not.toContain('*');
    });

    test('Code avec espaces', () => {
      const input = 'Voici du `code inline` dans phrase';
      const result = parseContent(input);
      
      const block = result.blocks[0] as any;
      const richText = block.paragraph?.rich_text as NotionRichText[];
      const fullText = richText.map((rt: NotionRichText) => rt.text?.content || '').join('');
      
      expect(fullText).toBe('Voici du code inline dans phrase');
      expect(fullText).not.toContain('`');
    });
  });

  describe('Fix #2: Citations - Retrait >', () => {
    test('Citation simple', () => {
      const input = '> Citation simple';
      const result = parseContent(input);
      
      expect(result.blocks[0].type).toBe('quote');
      const block = result.blocks[0] as any;
      const text = block.quote?.rich_text?.[0]?.text?.content;
      
      expect(text).toBe('Citation simple');
      expect(text).not.toContain('>');
    });

    test('Citation imbriquée', () => {
      const input = `> Citation niveau 1\n> > Citation niveau 2\n> > > Citation niveau 3`;
      const result = parseContent(input);
      
      const block = result.blocks[0] as any;
      const text = block.quote?.rich_text?.[0]?.text?.content;
      
      // Vérifier qu'aucun > n'est visible
      expect(text).not.toContain('>');
      
      // Vérifier que tous les contenus sont présents
      expect(text).toContain('Citation niveau 1');
      expect(text).toContain('Citation niveau 2');
      expect(text).toContain('Citation niveau 3');
    });
  });

  describe('Fix #3: Toggle Headings', () => {
    test('Toggle H1 avec contenu', () => {
      const input = `> # Toggle Heading\n> Contenu ligne 1\n> Contenu ligne 2`;
      const result = parseContent(input);
      
      expect(result.blocks[0].type).toBe('heading_1');
      const block = result.blocks[0] as any;
      expect(block.heading_1?.is_toggleable).toBe(true);
      
      // Vérifier qu'il y a des blocs enfants dans la liste plate
      expect(result.blocks.length).toBeGreaterThan(1);
    });

    test('Toggle H2', () => {
      const input = `> ## Sous-section\n> Contenu`;
      const result = parseContent(input);
      
      expect(result.blocks[0].type).toBe('heading_2');
      const block = result.blocks[0] as any;
      expect(block.heading_2?.is_toggleable).toBe(true);
    });

    test('Toggle H3', () => {
      const input = `> ### Detail\n> Info`;
      const result = parseContent(input);
      
      expect(result.blocks[0].type).toBe('heading_3');
      const block = result.blocks[0] as any;
      expect(block.heading_3?.is_toggleable).toBe(true);
    });

    test('Toggle avec liste enfant', () => {
      const input = `> # Liste\n> - Item 1\n> - Item 2`;
      const result = parseContent(input);
      
      expect(result.blocks[0].type).toBe('heading_1');
      // Les enfants sont dans la liste plate, pas imbriqués
      expect(result.blocks.length).toBeGreaterThan(1);
      expect(result.blocks[1].type).toBe('bulleted_list_item');
    });
  });
});