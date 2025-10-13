const { parseContent } = require('./dist/parseContent');

// Test avec des fonctionnalités avancées
const advancedContent = `# Test Fonctionnalités Avancées

## Callouts

> [!note]
> Ceci est une note importante avec du **formatage**.

> [!warning]
> Attention ! Ceci est un avertissement.

## Tableaux

| Nom | Age | Ville |
|-----|-----|-------|
| Alice | 30 | Paris |
| Bob | 25 | Lyon |

## Toggle Headings

> # Toggle Principal
> Contenu qui peut être masqué
> Avec plusieurs lignes

## Équations

L'énergie est $E = mc^2$ selon Einstein.

$$
\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)
$$

## Médias

![Image test](https://example.com/image.jpg)

https://www.youtube.com/watch?v=dQw4w9WgXcQ

https://example.com/audio.mp3

## Liens et Bookmarks

Voici un [lien vers Google](https://google.com).

https://github.com/makenotion/notion-sdk-js
`;

console.log('Testing parseContent with advanced features...');

try {
  const result = parseContent(advancedContent);
  console.log('Success:', result.success);
  console.log('Blocks count:', result.blocks.length);
  console.log('Error:', result.error);
  
  if (result.blocks.length > 0) {
    console.log('\nAdvanced blocks:');
    result.blocks.forEach((block, i) => {
      console.log(`Block ${i} (${block.type}):`, JSON.stringify(block, null, 2));
    });
  }
  
} catch (error) {
  console.error('Exception caught:', error.message);
  console.error('Stack:', error.stack);
}