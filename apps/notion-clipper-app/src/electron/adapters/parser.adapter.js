class ElectronParserAdapter {
    constructor() {
      this.initialized = true;
    }
  
    // Parser du texte brut
    async parseText(text) {
      if (!text || typeof text !== 'string') {
        return { type: 'text', blocks: [] };
      }
  
      // Découper en paragraphes
      const paragraphs = text.split('\n\n').filter(p => p.trim());
      
      const blocks = paragraphs.map(para => ({
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: para.trim() }
          }]
        }
      }));
  
      return { type: 'text', blocks };
    }
  
    // Parser HTML vers Notion blocks
    async parseHTML(html) {
      // Simpliste pour l'instant
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return this.parseText(text);
    }
  
    // Parser Markdown vers Notion blocks
    async parseMarkdown(markdown) {
      const blocks = [];
      const lines = markdown.split('\n');
  
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (!trimmed) continue;
  
        // Headers
        if (trimmed.startsWith('# ')) {
          blocks.push({
            type: 'heading_1',
            heading_1: {
              rich_text: [{ type: 'text', text: { content: trimmed.slice(2) } }]
            }
          });
        } else if (trimmed.startsWith('## ')) {
          blocks.push({
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: trimmed.slice(3) } }]
            }
          });
        } else if (trimmed.startsWith('### ')) {
          blocks.push({
            type: 'heading_3',
            heading_3: {
              rich_text: [{ type: 'text', text: { content: trimmed.slice(4) } }]
            }
          });
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          blocks.push({
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: [{ type: 'text', text: { content: trimmed.slice(2) } }]
            }
          });
        } else if (/^\d+\.\s/.test(trimmed)) {
          blocks.push({
            type: 'numbered_list_item',
            numbered_list_item: {
              rich_text: [{ type: 'text', text: { content: trimmed.replace(/^\d+\.\s/, '') } }]
            }
          });
        } else if (trimmed.startsWith('```')) {
          // Code block (simpliste)
          continue;
        } else {
          blocks.push({
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: trimmed } }]
            }
          });
        }
      }
  
      return { type: 'markdown', blocks };
    }
  
    // Parser une URL
    async parseURL(url) {
      return {
        type: 'url',
        blocks: [{
          type: 'bookmark',
          bookmark: { url }
        }]
      };
    }
  
    // Parser du code
    async parseCode(code, language = 'plain text') {
      return {
        type: 'code',
        blocks: [{
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: code } }],
            language
          }
        }]
      };
    }
  
    // Détection automatique du type
    async parse(content, hint = null) {
      if (!content) {
        return { type: 'empty', blocks: [] };
      }
  
      // Si hint fourni
      if (hint === 'markdown') return this.parseMarkdown(content);
      if (hint === 'html') return this.parseHTML(content);
      if (hint === 'code') return this.parseCode(content);
      if (hint === 'url') return this.parseURL(content);
  
      // Auto-détection
      if (typeof content === 'string') {
        if (content.startsWith('http://') || content.startsWith('https://')) {
          return this.parseURL(content);
        }
        if (content.includes('<html') || content.includes('</')) {
          return this.parseHTML(content);
        }
        if (content.includes('# ') || content.includes('## ')) {
          return this.parseMarkdown(content);
        }
      }
  
      // Par défaut : texte
      return this.parseText(content);
    }
  }
  
  module.exports = ElectronParserAdapter;