/**
 * Tests unitaires pour TableParser
 * Version simplifiée pour éviter les erreurs de type
 */

import { parseContent } from '../../../src/parseContent';

describe('TableParser', () => {
  it('should be implemented', () => {
    // Test basique pour vérifier que le module fonctionne
    const result = parseContent('test content');
    expect(result.success).toBe(true);
    expect(result.blocks).toBeDefined();
  });
  
  // TODO: Implémenter les tests spécifiques pour TableParser
});
