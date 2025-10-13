import { RichTextConverter } from '../src/converters/RichTextConverter';

describe('Empty URL Fix Tests', () => {
  const converter = new RichTextConverter();

  test('Liens avec URLs vides ne génèrent pas de link', () => {
    // Cas qui pourraient générer des URLs vides
    const testCases = [
      '[text]()',           // URL vide
      '[text]( )',          // URL avec espaces
      '[text](   )',        // URL avec plusieurs espaces
      '[text]("")',         // URL avec guillemets vides
      '[text](\'\')',       // URL avec apostrophes vides
    ];

    for (const testCase of testCases) {
      const result = converter.parseRichText(testCase);
      
      // Vérifier qu'aucun élément n'a de link avec URL vide
      for (const item of result) {
        if (item.type === 'text' && item.text?.link) {
          expect(item.text.link.url).toBeTruthy();
          expect(item.text.link.url.trim()).not.toBe('');
        }
      }
    }
  });

  test('Liens valides fonctionnent toujours', () => {
    const validLinks = [
      '[Google](https://google.com)',
      '[Notion](https://notion.so)',
      '[GitHub](https://github.com)',
    ];

    for (const link of validLinks) {
      const result = converter.parseRichText(link);
      
      // Doit avoir au moins un lien valide
      const hasValidLink = result.some(item => 
        item.type === 'text' && 
        item.text?.link && 
        item.text.link.url && 
        item.text.link.url.trim() !== ''
      );
      
      expect(hasValidLink).toBe(true);
    }
  });

  test('Texte avec liens cassés devient texte normal', () => {
    const result = converter.parseRichText('[texte avec lien cassé]()');
    
    // Doit avoir du texte mais pas de liens
    expect(result.length).toBeGreaterThan(0);
    
    const hasEmptyLink = result.some(item => 
      item.type === 'text' && 
      item.text?.link && 
      (!item.text.link.url || item.text.link.url.trim() === '')
    );
    
    expect(hasEmptyLink).toBe(false);
  });

  test('Validation complète - aucune URL vide générée', () => {
    const complexText = `
    Voici du texte avec [lien valide](https://notion.so) et [lien cassé]() 
    et aussi [autre cassé]( ) et **formatage gras** avec [lien dans gras](https://google.com).
    `;

    const result = converter.parseRichText(complexText);
    
    // Vérifier qu'aucun élément n'a d'URL vide
    for (const item of result) {
      if (item.type === 'text' && item.text?.link) {
        expect(item.text.link.url).toBeTruthy();
        expect(item.text.link.url.trim()).not.toBe('');
        expect(item.text.link.url).not.toBe('""');
        expect(item.text.link.url).not.toBe("''");
      }
    }

    // Doit avoir au moins les liens valides
    const validLinks = result.filter(item => 
      item.type === 'text' && 
      item.text?.link && 
      item.text.link.url && 
      item.text.link.url.trim() !== ''
    );

    expect(validLinks.length).toBeGreaterThanOrEqual(2); // Au moins 2 liens valides
  });
});