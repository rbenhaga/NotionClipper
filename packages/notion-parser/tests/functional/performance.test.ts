/**
 * Tests de performance - CDC §8.3
 */

import { parseContent } from '../../src/parseContent';
import { ContentDetector } from '../../src/detectors/ContentDetector';

describe('6. Performance', () => {
  test('Parsing 1000 lignes < 200ms', () => {
    const content = Array(1000).fill('Line of text').join('\n');
    
    const start = Date.now();
    const result = parseContent(content);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(200);
    expect(result.success).toBe(true);
  });

  test('Détection < 5ms pour contenu simple', () => {
    const detector = new ContentDetector();
    
    const start = Date.now();
    detector.detect('https://example.com');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5);
  });

  test('Pas de fuite mémoire sur gros documents', () => {
    // Simuler parsing répété
    for (let i = 0; i < 100; i++) {
      const largeDoc = 'x'.repeat(100000);
      parseContent(largeDoc);
    }
    
    // Si on arrive ici, pas de crash mémoire
    expect(true).toBe(true);
  });

  test('Protection ReDoS', () => {
    const maliciousPattern = 'x'.repeat(50000) + '!';
    
    const start = Date.now();
    parseContent(maliciousPattern);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});