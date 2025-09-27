const { clipboard, nativeImage } = require('electron');
const crypto = require('crypto');
const { parse } = require('node-html-parser');
const EventEmitter = require('events');

class ClipboardService extends EventEmitter {
  constructor() {
    super();
    this.lastContent = null;
    this.lastHash = null;
    this.pollInterval = null;
    this.history = [];
    this.maxHistorySize = 50;
    this.isWatching = false;
    this.watchInterval = 500;
  }

  /**
   * Nettoie et convertit le HTML en texte markdown
   */
  cleanHTML(html) {
    try {
      // Parser le HTML
      const root = parse(html, {
        lowerCaseTagName: false,
        comment: false,
        blockTextElements: {
          script: false,
          noscript: false,
          style: false,
          pre: true
        }
      });

      // Supprimer les éléments inutiles
      root.querySelectorAll('script, style, noscript').forEach(el => el.remove());

      // Convertir les titres en markdown
      for (let i = 6; i >= 1; i--) {
        root.querySelectorAll(`h${i}`).forEach(el => {
          const text = el.innerText.trim();
          if (text) {
            const hashes = '#'.repeat(i);
            el.replaceWith(`\n\n${hashes} ${text}\n\n`);
          }
        });
      }

      // Convertir les listes à puces
      root.querySelectorAll('ul').forEach(ul => {
        const items = ul.querySelectorAll('li');
        let listText = '\n';
        items.forEach(li => {
          const text = this.extractTextWithFormatting(li);
          if (text.trim()) {
            listText += `• ${text.trim()}\n`;
          }
        });
        ul.replaceWith(listText);
      });

      // Convertir les listes numérotées
      root.querySelectorAll('ol').forEach(ol => {
        const items = ol.querySelectorAll('li');
        let listText = '\n';
        items.forEach((li, index) => {
          const text = this.extractTextWithFormatting(li);
          if (text.trim()) {
            listText += `${index + 1}. ${text.trim()}\n`;
          }
        });
        ol.replaceWith(listText);
      });

      // Convertir le formatage en ligne AVANT d'extraire le texte
      // Gras
      root.querySelectorAll('strong, b').forEach(el => {
        const text = el.innerText.trim();
        if (text) {
          el.replaceWith(`**${text}**`);
        }
      });

      // Italique
      root.querySelectorAll('em, i').forEach(el => {
        const text = el.innerText.trim();
        if (text) {
          el.replaceWith(`*${text}*`);
        }
      });

      // Code inline
      root.querySelectorAll('code').forEach(el => {
        const text = el.innerText.trim();
        if (text && !el.closest('pre')) {
          el.replaceWith(`\`${text}\``);
        }
      });

      // Blocs de code
      root.querySelectorAll('pre').forEach(pre => {
        const code = pre.querySelector('code') || pre;
        const text = code.innerText;
        if (text.trim()) {
          // Détecter le langage si possible
          let lang = '';
          const classAttr = code.getAttribute('class') || '';
          const langMatch = classAttr.match(/language-(\w+)/);
          if (langMatch) {
            lang = langMatch[1];
          }
          pre.replaceWith(`\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`);
        }
      });

      // Liens
      root.querySelectorAll('a').forEach(a => {
        const text = a.innerText.trim();
        const href = a.getAttribute('href');
        if (text && href && !href.startsWith('#')) {
          a.replaceWith(`[${text}](${href})`);
        } else if (text) {
          a.replaceWith(text);
        }
      });

      // Citations
      root.querySelectorAll('blockquote').forEach(bq => {
        const text = this.extractTextWithFormatting(bq);
        if (text.trim()) {
          const quotedText = text.trim().split('\n').map(line => `> ${line}`).join('\n');
          bq.replaceWith(`\n\n${quotedText}\n\n`);
        }
      });

      // Tableaux simples
      root.querySelectorAll('table').forEach(table => {
        let tableText = '\n\n';
        const rows = table.querySelectorAll('tr');
        
        if (rows.length > 0) {
          // En-têtes
          const headers = rows[0].querySelectorAll('th, td');
          if (headers.length > 0) {
            tableText += '| ' + Array.from(headers).map(h => h.innerText.trim()).join(' | ') + ' |\n';
            tableText += '|' + Array(headers.length).fill('---').join('|') + '|\n';
          }
          
          // Lignes
          for (let i = headers.length > 0 ? 1 : 0; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length > 0) {
              tableText += '| ' + Array.from(cells).map(c => c.innerText.trim()).join(' | ') + ' |\n';
            }
          }
        }
        
        table.replaceWith(tableText + '\n');
      });

      // Images
      root.querySelectorAll('img').forEach(img => {
        const alt = img.getAttribute('alt') || 'image';
        const src = img.getAttribute('src');
        if (src) {
          img.replaceWith(`![${alt}](${src})`);
        }
      });

      // Règles horizontales
      root.querySelectorAll('hr').forEach(hr => {
        hr.replaceWith('\n\n---\n\n');
      });

      // Paragraphes
      root.querySelectorAll('p').forEach(p => {
        const text = this.extractTextWithFormatting(p);
        if (text.trim()) {
          p.replaceWith(`\n\n${text.trim()}\n\n`);
        }
      });

      // Sauts de ligne
      root.querySelectorAll('br').forEach(br => {
        br.replaceWith('\n');
      });

      // Extraire le texte final
      let text = root.innerText || root.textContent || root.text || '';

      // Décoder les entités HTML restantes
      text = this.decodeHTMLEntities(text);

      // Nettoyer les espaces et sauts de ligne excessifs
      text = text
        // Supprimer les espaces en début de ligne
        .replace(/^[ \t]+/gm, '')
        // Supprimer les espaces en fin de ligne
        .replace(/[ \t]+$/gm, '')
        // Réduire les sauts de ligne multiples
        .replace(/\n{3,}/g, '\n\n')
        // Supprimer les espaces multiples
        .replace(/[ \t]{2,}/g, ' ')
        // Nettoyer le début et la fin
        .trim();

      return text;
    } catch (error) {
      console.error('Erreur parsing HTML:', error);
      // Fallback : supprimer simplement les tags
      return html
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
    }
  }

  /**
   * Extrait le texte avec formatage préservé
   */
  extractTextWithFormatting(element) {
    let text = element.innerHTML || '';
    // Préserver les balises de formatage inline
    text = text
      .replace(/<strong>/gi, '**')
      .replace(/<\/strong>/gi, '**')
      .replace(/<b>/gi, '**')
      .replace(/<\/b>/gi, '**')
      .replace(/<em>/gi, '*')
      .replace(/<\/em>/gi, '*')
      .replace(/<i>/gi, '*')
      .replace(/<\/i>/gi, '*')
      .replace(/<code>/gi, '`')
      .replace(/<\/code>/gi, '`')
      .replace(/<[^>]+>/g, ''); // Supprimer les autres tags
    
    return this.decodeHTMLEntities(text);
  }

  /**
   * Décode les entités HTML
   */
  decodeHTMLEntities(text) {
    const entities = {
      '&nbsp;': ' ',
      '&quot;': '"',
      '&apos;': "'",
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&#39;': "'",
      '&#x27;': "'",
      '&#x2F;': '/',
      '&#x60;': '`',
      '&#x3D;': '='
    };

    for (const [entity, char] of Object.entries(entities)) {
      text = text.replace(new RegExp(entity, 'g'), char);
    }

    // Décoder les entités numériques
    text = text.replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(dec);
    });

    text = text.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });

    return text;
  }

  /**
   * Récupère le contenu du presse-papier
   */
  getContent() {
    try {
      // Image
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        const detection = require('./contentDetector').detect('image');
        const enriched = {
          type: detection.type,
          subtype: detection.subtype,
          data: image.toDataURL(),
          size: image.getSize(),
          timestamp: Date.now()
        };
        enriched.hash = this.calculateHash(enriched);
        return enriched;
      }

      // HTML
      const html = clipboard.readHTML();
      if (html && html.trim()) {
        // Vérifier si c'est vraiment du HTML avec des tags
        if (/<[^>]+>/.test(html)) {
          // Nettoyer et convertir le HTML en markdown
          const cleanedText = this.cleanHTML(html);
          const detection = require('./contentDetector').detect(cleanedText);
          
          const enriched = {
            type: detection.type,
            subtype: detection.subtype,
            data: cleanedText, // Utiliser le texte nettoyé
            text: cleanedText, // Pour compatibilité
            originalHtml: html.substring(0, 1000), // Garder un échantillon de l'original
            wasHtml: true, // Indicateur que c'était du HTML
            length: cleanedText.length,
            confidence: detection.confidence,
            metadata: detection.metadata,
            timestamp: Date.now()
          };
          enriched.hash = this.calculateHash(enriched);
          return enriched;
        }
      }

      // Texte normal
      const text = clipboard.readText();
      if (text && text.trim()) {
        const detection = require('./contentDetector').detect(text);
        const enriched = {
          type: detection.type,
          subtype: detection.subtype,
          data: text,
          text: text,
          length: text.length,
          confidence: detection.confidence,
          metadata: detection.metadata,
          timestamp: Date.now()
        };
        enriched.hash = this.calculateHash(enriched);
        return enriched;
      }

      return null;
    } catch (error) {
      console.error('Get content error:', error);
      return null;
    }
  }

  /**
   * Définit le contenu du presse-papier
   */
  setContent(content, type = 'text') {
    try {
      switch (type) {
        case 'text':
        case 'markdown':
        case 'code':
        case 'url':
          clipboard.writeText(content);
          break;
        case 'image':
          if (typeof content === 'string' && content.startsWith('data:image')) {
            const base64Data = content.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const image = nativeImage.createFromBuffer(buffer);
            clipboard.writeImage(image);
          } else if (Buffer.isBuffer(content)) {
            const image = nativeImage.createFromBuffer(content);
            clipboard.writeImage(image);
          }
          break;
        case 'html':
          clipboard.writeHTML(content);
          break;
        default:
          clipboard.writeText(content);
      }
      setTimeout(() => this.checkForChanges(), 100);
      return true;
    } catch (error) {
      console.error('Set content error:', error);
      return false;
    }
  }

  /**
   * Vide le presse-papier
   */
  clear() {
    clipboard.clear();
    this.lastContent = null;
    this.lastHash = null;
    this.emit('cleared');
    return true;
  }

  /**
   * Vérifie si le contenu a changé
   */
  hasChanged() {
    const current = this.getContent();
    if (!current) return false;

    const currentHash = this.calculateHash(current);
    const changed = currentHash !== this.lastHash;

    if (changed) {
      this.lastContent = current;
      this.lastHash = currentHash;
    }

    return changed;
  }

  /**
   * Calcule un hash unique pour le contenu
   */
  calculateHash(content) {
    if (!content) return null;
    const str = JSON.stringify({
      type: content.type,
      data: content.data?.substring(0, 1000),
      length: content.length || content.data?.length || 0
    });
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * Récupère des informations sur le contenu actuel
   */
  getContentInfo() {
    const content = this.getContent();
    if (!content) return null;

    return {
      type: content.type,
      subtype: content.subtype,
      length: content.length || content.data?.length || 0,
      timestamp: content.timestamp,
      wasHtml: content.wasHtml || false
    };
  }

  /**
   * Démarre la surveillance du presse-papier
   */
  startWatching(interval = null) {
    if (this.isWatching) {
      console.log('⚠️ Clipboard watching already started');
      return;
    }
    this.watchInterval = interval || this.watchInterval;
    this.isWatching = true;
    console.log(`👁️ Starting clipboard watch (interval: ${this.watchInterval}ms)`);
    this.checkForChanges();
    this.pollInterval = setInterval(() => { this.checkForChanges(); }, this.watchInterval);
  }

  /**
   * Arrête la surveillance du presse-papier
   */
  stopWatching() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isWatching = false;
      console.log('⏹️ Clipboard watching stopped');
    }
  }

  /**
   * Vérifie les changements dans le presse-papier
   */
  async checkForChanges() {
    try {
      const current = await this.getContent();
      if (!current) {
        if (this.lastContent) {
          this.lastContent = null;
          this.lastHash = null;
          this.emit('cleared');
        }
        return false;
      }
      const currentHash = current.hash || this.calculateHash(current);
      const changed = currentHash !== this.lastHash;
      if (changed) {
        console.log(`📋 Clipboard changed: ${current.type}/${current.subtype || 'default'}`);
        const previous = this.lastContent;
        this.lastContent = current;
        this.lastHash = currentHash;
        this.addToHistory(current);
        this.emit('content-changed', { current, previous, timestamp: Date.now() });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Check for changes error:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Ajoute un élément à l'historique
   */
  addToHistory(content) {
    const historyItem = { ...content, id: Date.now().toString(), addedAt: new Date().toISOString() };
    this.history.unshift(historyItem);
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
    this.emit('history-updated', this.history);
  }

  /**
   * Récupère l'historique
   */
  getHistory() { 
    return this.history; 
  }

  /**
   * Vide l'historique
   */
  clearHistory() { 
    this.history = []; 
    this.emit('history-cleared'); 
  }

  /**
   * Récupère les statistiques du service
   */
  getStats() {
    return {
      isWatching: this.isWatching,
      watchInterval: this.watchInterval,
      historySize: this.history.length,
      lastContent: this.lastContent ? {
        type: this.lastContent.type,
        subtype: this.lastContent.subtype,
        timestamp: this.lastContent.timestamp
      } : null
    };
  }
}

module.exports = new ClipboardService();