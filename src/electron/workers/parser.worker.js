const { parentPort } = require('worker_threads');
const hljs = require('highlight.js');

// NE PAS configurer marked ici - il sera importé dynamiquement

// Fonction de parsing intensive
async function parseComplexContent(data) {
  const { content, type, options } = data;
  
  try {
    let result;
    
    switch (type) {
      case 'markdown':
        result = await parseMarkdownAdvanced(content, options);
        break;
        
      case 'csv':
        result = parseCSV(content, options);
        break;
        
      case 'json':
        result = parseJSON(content, options);
        break;
        
      case 'html':
        result = await parseHTML(content, options);
        break;
        
      default:
        result = { error: 'Type non supporté' };
    }
    
    return { success: true, result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      stack: error.stack 
    };
  }
}

// Parser Markdown avancé
async function parseMarkdownAdvanced(content, options = {}) {
  // Import dynamique de marked
  const { marked } = await import('marked');
  
  // Configurer marked après l'import
  marked.setOptions({
    highlight: function(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
    breaks: true,
    gfm: true
  });
  
  const tokens = marked.lexer(content);
  const blocks = [];
  
  // Parser récursif pour gérer les structures imbriquées
  function processToken(token, depth = 0) {
    switch (token.type) {
      case 'heading':
        return createHeading(token, depth);
        
      case 'list':
        return createList(token, depth);
        
      case 'table':
        return createTable(token);
        
      case 'code':
        return createCodeBlock(token);
        
      case 'blockquote':
        return createQuote(token, depth);
        
      case 'paragraph':
        return createParagraph(token);
        
      case 'hr':
        return { type: 'divider', divider: {} };
        
      default:
        return null;
    }
  }
  
  // Traiter tous les tokens
  tokens.forEach(token => {
    const block = processToken(token);
    if (block) {
      if (Array.isArray(block)) {
        blocks.push(...block);
      } else {
        blocks.push(block);
      }
    }
  });
  
  return { blocks, metadata: extractMetadata(content) };
}

// Parser CSV
function parseCSV(content, options = {}) {
  const lines = content.trim().split('\n');
  const delimiter = options.delimiter || detectDelimiter(content);
  
  if (lines.length === 0) return { blocks: [] };
  
  // Parser l'en-tête
  const headers = lines[0].split(delimiter).map(h => h.trim());
  
  // Créer une table Notion
  const tableBlock = {
    type: 'table',
    table: {
      table_width: headers.length,
      has_column_header: true,
      has_row_header: false,
      children: []
    }
  };
  
  // Ajouter l'en-tête
  const headerRow = {
    type: 'table_row',
    table_row: {
      cells: headers.map(header => [{
        type: 'text',
        text: { content: header },
        annotations: { bold: true }
      }])
    }
  };
  
  tableBlock.table.children.push(headerRow);
  
  // Ajouter les données
  for (let i = 1; i < lines.length && i < 100; i++) { // Limiter à 100 lignes
    const cells = lines[i].split(delimiter).map(cell => cell.trim());
    
    const row = {
      type: 'table_row',
      table_row: {
        cells: cells.map(cell => [{
          type: 'text',
          text: { content: cell }
        }])
      }
    };
    
    tableBlock.table.children.push(row);
  }
  
  return { 
    blocks: [tableBlock],
    metadata: {
      rows: lines.length - 1,
      columns: headers.length,
      truncated: lines.length > 100
    }
  };
}

// Parser JSON
function parseJSON(content, options = {}) {
  try {
    const parsed = JSON.parse(content);
    const formatted = JSON.stringify(parsed, null, 2);
    
    return {
      blocks: [{
        type: 'code',
        code: {
          rich_text: [{
            type: 'text',
            text: { content: formatted }
          }],
          language: 'json'
        }
      }]
    };
  } catch (error) {
    return {
      blocks: [{
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: 'Erreur parsing JSON: ' + error.message }
          }]
        }
      }]
    };
  }
}

// Parser HTML
async function parseHTML(content, options = {}) {
  // Extraire le texte du HTML
  const textContent = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return {
    blocks: [{
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { content: textContent }
        }]
      }
    }]
  };
}

// Helpers
function detectDelimiter(content) {
  const firstLine = content.split('\n')[0];
  const delimiters = [',', '\t', ';', '|'];
  
  let maxCount = 0;
  let bestDelimiter = ',';
  
  delimiters.forEach(d => {
    const count = (firstLine.match(new RegExp(d, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = d;
    }
  });
  
  return bestDelimiter;
}

function createHeading(token, depth) {
  const level = Math.min(token.depth || 1, 3);
  const type = `heading_${level}`;
  
  return {
    type,
    [type]: {
      rich_text: parseInlineElements(token.text || '')
    }
  };
}

function createParagraph(token) {
  return {
    type: 'paragraph',
    paragraph: {
      rich_text: parseInlineElements(token.text || '')
    }
  };
}

function createList(token, depth) {
  if (!token.items || !Array.isArray(token.items)) return [];
  
  return token.items.map(item => ({
    type: token.ordered ? 'numbered_list_item' : 'bulleted_list_item',
    [token.ordered ? 'numbered_list_item' : 'bulleted_list_item']: {
      rich_text: parseInlineElements(item.text || '')
    }
  }));
}

function createTable(token) {
  // Implémenter la création de table
  return {
    type: 'table',
    table: {
      table_width: 2,
      has_column_header: true,
      has_row_header: false,
      children: []
    }
  };
}

function createCodeBlock(token) {
  return {
    type: 'code',
    code: {
      rich_text: [{
        type: 'text',
        text: { content: token.text || '' }
      }],
      language: token.lang || 'plain text'
    }
  };
}

function createQuote(token, depth) {
  return {
    type: 'quote',
    quote: {
      rich_text: parseInlineElements(token.text || '')
    }
  };
}

function extractMetadata(content) {
  // Extraire les métadonnées du contenu
  return {
    length: content.length,
    lines: content.split('\n').length,
    words: content.split(/\s+/).length
  };
}

function parseInlineElements(text) {
  // Parser les éléments inline (gras, italique, liens, etc.)
  // Pour simplifier, retourner juste le texte pour l'instant
  return [{
    type: 'text',
    text: { content: text }
  }];
}

// Écouter les messages du thread principal
parentPort.on('message', async (message) => {
  // Rendre la fonction async pour gérer parseComplexContent qui est maintenant async
  const result = await parseComplexContent(message);
  parentPort.postMessage(result);
});