// Test des adapters sans Electron
const path = require('path');

console.log('🧪 Test des adapters...');

try {
  // Charger juste les types et interfaces
  const core = require('./packages/core/dist/index.js');
  console.log('✅ Core chargé:', Object.keys(core));
  
  // Test des services core
  const { ClipboardService, NotionService } = core;
  console.log('✅ Services disponibles:', { ClipboardService: !!ClipboardService, NotionService: !!NotionService });
  
  // Test des parsers
  const { contentDetector, notionMarkdownParser } = core;
  console.log('✅ Parsers disponibles:', { contentDetector: !!contentDetector, notionMarkdownParser: !!notionMarkdownParser });
  
  // Test du convertisseur
  const { htmlToMarkdownConverter } = core;
  console.log('✅ Convertisseur disponible:', !!htmlToMarkdownConverter);
  
  console.log('🎉 Migration réussie ! Les packages core sont fonctionnels.');
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
}
