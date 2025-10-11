/**
 * Exemple d'intégration avec le système existant
 */

import { parseContent } from '../src';

/**
 * Fonction utilitaire pour intégrer le nouveau parser avec l'ancien système
 */
export function migrateFromOldParser(content: string, options: any = {}) {
  // Mapping des anciennes options vers les nouvelles
  const newOptions = {
    contentType: options.contentType || 'auto',
    color: options.color || 'default',
    maxBlocks: options.maxBlocksPerRequest || 100,
    
    detection: {
      enableMarkdownDetection: true,
      enableCodeDetection: true,
      enableTableDetection: true,
      enableUrlDetection: true,
      enableHtmlDetection: true
    },
    
    conversion: {
      preserveFormatting: true,
      convertLinks: true,
      convertImages: true,
      convertTables: true,
      convertCode: true
    },
    
    formatting: {
      removeEmptyBlocks: true,
      normalizeWhitespace: true,
      maxConsecutiveEmptyLines: 1
    },
    
    validation: {
      strictMode: false,
      validateRichText: true,
      validateBlockStructure: true
    }
  };

  return parseContent(content, newOptions);
}

/**
 * Fonction pour traiter le contenu d'une page web
 */
export function parseWebContent(html: string, url?: string) {
  return parseContent(html, {
    contentType: 'html',
    conversion: {
      preserveFormatting: true,
      convertLinks: true,
      convertImages: true
    },
    formatting: {
      removeEmptyBlocks: true,
      normalizeWhitespace: true
    },
    metadata: {
      sourceUrl: url,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Fonction pour traiter le contenu du clipboard
 */
export function parseClipboardContent(content: string, contentType?: string) {
  return parseContent(content, {
    contentType: contentType || 'auto',
    maxBlocks: 50, // Limite pour le clipboard
    
    conversion: {
      preserveFormatting: true,
      convertLinks: true,
      convertImages: false // Éviter les images depuis le clipboard
    },
    
    formatting: {
      removeEmptyBlocks: true,
      normalizeWhitespace: true,
      maxConsecutiveEmptyLines: 1
    },
    
    includeValidation: true
  });
}

/**
 * Fonction pour traiter des fichiers de code
 */
export function parseCodeFile(content: string, filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'c++',
    'c': 'c',
    'cs': 'c#',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'sql': 'sql',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml'
  };

  const language = extension ? languageMap[extension] || 'plain text' : 'plain text';

  return parseContent(content, {
    contentType: 'code',
    metadata: {
      language,
      filename
    }
  });
}

/**
 * Fonction pour traiter des tableaux de données
 */
export function parseDataTable(content: string, format: 'csv' | 'tsv' | 'json' = 'csv') {
  if (format === 'json') {
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) {
        // Convertir JSON en CSV pour le parser
        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map(row => headers.map(h => row[h] || '').join(','))
        ].join('\n');
        
        return parseContent(csvContent, { contentType: 'csv' });
      }
    } catch {
      // Fallback to text if JSON parsing fails
      return parseContent(content, { contentType: 'text' });
    }
  }

  return parseContent(content, { contentType: format });
}

// Exemples d'utilisation
if (require.main === module) {
  console.log('=== Tests d\'intégration ===');

  // Test migration
  const oldStyleContent = '# Test\n\nContent with **bold** text.';
  const migratedBlocks = migrateFromOldParser(oldStyleContent, {
    color: 'blue_background'
  });
  console.log(`Migration: ${migratedBlocks.length} blocs générés`);

  // Test web content
  const htmlContent = '<h1>Title</h1><p>Some <strong>bold</strong> text.</p>';
  const webBlocks = parseWebContent(htmlContent, 'https://example.com');
  console.log(`Web content: ${webBlocks.length} blocs générés`);

  // Test clipboard
  const clipboardResult = parseClipboardContent('Some clipboard text with **formatting**');
  console.log(`Clipboard: ${Array.isArray(clipboardResult) ? clipboardResult.length : clipboardResult.blocks.length} blocs générés`);

  // Test code file
  const codeContent = 'function hello() { console.log("Hello!"); }';
  const codeBlocks = parseCodeFile(codeContent, 'example.js');
  console.log(`Code file: ${codeBlocks.length} blocs générés`);

  // Test data table
  const jsonData = '[{"name":"John","age":25},{"name":"Jane","age":30}]';
  const tableBlocks = parseDataTable(jsonData, 'json');
  console.log(`Data table: ${tableBlocks.length} blocs générés`);
}