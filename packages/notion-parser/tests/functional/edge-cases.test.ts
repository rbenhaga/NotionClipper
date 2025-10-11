/**
 * Tests des cas limites - CDC §8
 */

import { parseContent } from '../../src/parseContent';

describe('8. Gestion des cas limites', () => {
  test('Entrées null/undefined/vides', () => {
    const inputs = [null, undefined, '', '   ', '\n\n\n'];
    
    inputs.forEach(input => {
      expect(() => parseContent(input as any)).not.toThrow();
      const result = parseContent(input as any);
      expect(result.success).toBe(true);
    });
  });

  test('Contenu malformé', () => {
    const malformed = [
      '{broken json',
      '<unclosed tag',
      '```no closing',
      '| broken | table',
      '$unclosed latex'
    ];

    malformed.forEach(content => {
      expect(() => parseContent(content)).not.toThrow();
      const result = parseContent(content);
      expect(result).toBeDefined();
    });
  });

  test('Caractères spéciaux et Unicode', () => {
    const special = [
      '🔥 Emoji test 🎉',
      '中文测试',
      'العربية',
      '\u200B\u200C\u200D', // Zero-width chars
      '\\x00\\x01\\x02' // Control chars
    ];

    special.forEach(content => {
      const result = parseContent(content);
      expect(result.success).toBe(true);
    });
  });
});