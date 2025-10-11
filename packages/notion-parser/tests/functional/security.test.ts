/**
 * Tests de sécurité - CDC §7
 */

import { parseContent } from '../../src/parseContent';
import { NotionValidator } from '../../src/validators/NotionValidator';

describe('5. Sécurité', () => {
  test('Protection XSS', () => {
    const xssAttempts = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>'
    ];

    xssAttempts.forEach(xss => {
      const result = parseContent(xss);
      const json = JSON.stringify(result);
      // Vérifier que les balises dangereuses sont supprimées
      expect(json).not.toContain('<script');
      expect(json).not.toContain('onerror=');
      expect(json).not.toContain('onload=');
      expect(json).not.toContain('<svg');
    });
  });

  test('Protection injection formules', () => {
    const formulas = [
      '=cmd|"/c calc"',
      '@SUM(A1:A10)',
      '=HYPERLINK("evil.com")'
    ];

    formulas.forEach(formula => {
      const csv = `Name,Value\nTest,${formula}`;
      const result = parseContent(csv, { contentType: 'csv' });
      const json = JSON.stringify(result);
      
      // Les formules dangereuses doivent être neutralisées
      if (formula.startsWith('=') || formula.startsWith('@')) {
        // Vérifier que la formule est préfixée avec ' pour la neutraliser
        expect(json).toMatch(/'[=@]/);
      }
      
      // Vérifier que les commandes dangereuses sont supprimées
      expect(json).not.toContain('cmd|');
      expect(json).not.toContain('HYPERLINK');
    });
  });

  test('Validation URLs', () => {
    const badUrls = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd'
    ];

    const validator = new NotionValidator();
    badUrls.forEach(url => {
      const block = {
        type: 'bookmark',
        bookmark: { url }
      };
      const result = validator.validate([block], { validateUrls: true });
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});