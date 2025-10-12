/**
 * Tests de détection automatique du contenu - CDC §3.1
 */

import { ContentDetector } from '../../src/detectors/ContentDetector';

describe('1. Détection automatique du contenu', () => {
  const detector = new ContentDetector();

  test('Détection URLs - Confidence > 0.90', () => {
    const urls = [
      'http://example.com',
      'https://example.com/path?param=value'
    ];

    urls.forEach(url => {
      const result = detector.detect(url);
      expect(result.type).toBe('url');
      expect(result.confidence).toBeGreaterThan(0.90);
    });
  });

  test('Détection Audio URLs - Confidence > 0.90', () => {
    const audioUrls = [
      'https://example.com/audio.mp3',
      'https://example.com/podcast.wav',
      'https://example.com/music.ogg'
    ];

    audioUrls.forEach(url => {
      const result = detector.detect(url);
      expect(result.type).toBe('audio');
      expect(result.confidence).toBeGreaterThan(0.90);
    });
  });

  test('Détection Code - Confidence > 0.70', () => {
    const codeExamples = [
      'function test() { return true; }',
      'def hello():\n    print("Hi")',
      'public class Main { }',
      'SELECT * FROM users'
    ];

    codeExamples.forEach(code => {
      const result = detector.detect(code);
      expect(result.type).toBe('code');
      expect(result.confidence).toBeGreaterThan(0.70);
    });
  });

  test('Détection Tables (CSV/TSV) - Confidence > 0.60', () => {
    const tables = [
      'Name,Age\nJohn,30\nJane,25',
      'Name\tAge\nJohn\t30\nJane\t25',
      '| Name | Age |\n|------|-----|\n| John | 30 |\n| Jane | 25 |'
    ];

    tables.forEach(table => {
      const result = detector.detect(table);
      expect(['csv', 'tsv', 'table'].includes(result.type)).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.60);
    });
  });

  test('Détection LaTeX - Confidence > 0.50', () => {
    const latex = [
      '$x^2 + y^2 = z^2$',
      '$$\\int_0^\\infty e^{-x^2}$$',
      '\\begin{equation}E = mc^2\\end{equation}'
    ];

    latex.forEach(eq => {
      const result = detector.detect(eq);
      expect(result.type).toBe('latex');
      expect(result.confidence).toBeGreaterThan(0.50);
    });
  });

  test('Ordre de priorité: URL > Audio > LaTeX > Code > Table > Markdown', () => {
    // URL doit gagner même si ressemble à du code
    expect(detector.detect('https://github.com/code.js').type).toBe('url');
    
    // Audio doit gagner sur URL générique
    expect(detector.detect('https://example.com/file.mp3').type).toBe('audio');
    
    // Code JavaScript doit être détecté comme code même avec délimiteurs $
    expect(detector.detect('$function() { }$').type).toBe('code');
    
    // Vrai LaTeX doit être détecté comme LaTeX
    expect(detector.detect('$\\frac{a}{b} + \\sqrt{c}$').type).toBe('latex');
    
    // JSON doit être reconnu avant code générique  
    expect(detector.detect('{"valid": "json"}').type).toBe('json');
  });
});