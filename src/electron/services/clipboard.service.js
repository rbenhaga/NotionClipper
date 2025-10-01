const { clipboard, nativeImage } = require('electron');
const crypto = require('crypto');
const { parse } = require('node-html-parser');

class ClipboardService {
  constructor() {
    this.lastContent = null;
    this.lastHash = null;
  }

  /**
   * Convertit le HTML en markdown en préservant TOUT le formatage
   */
  convertHTMLToMarkdown(html) {
    try {
      console.log('🔄 Conversion HTML -> Markdown');
      
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

      // 1. Supprimer les éléments inutiles
      root.querySelectorAll('script, style, noscript, meta, link').forEach(el => el.remove());

      // 2. Traiter les éléments dans l'ordre hiérarchique correct
      
      // Gérer les éléments HTML non supportés mais qu'on veut préserver
      
      // Details/Summary (les convertir en toggle Notion)
      root.querySelectorAll('details').forEach(details => {
        const summary = details.querySelector('summary');
        const summaryText = summary ? this.getCleanText(summary) : 'Détails';
        
        // Obtenir le contenu sans le summary
        if (summary) summary.remove();
        const content = this.getCleanText(details);
        
        if (content.trim()) {
          details.replaceWith(`\n\n▸ **${summaryText}**\n${content}\n\n`);
        } else {
          details.replaceWith(`\n\n▸ **${summaryText}**\n\n`);
        }
      });
      
      // Keyboard keys (kbd)
      root.querySelectorAll('kbd').forEach(kbd => {
        const text = this.getCleanText(kbd);
        if (text) {
          kbd.replaceWith(`\`${text}\``); // Convertir en code inline
        }
      });
      
      // Exposant (sup) et indice (sub)
      root.querySelectorAll('sup').forEach(sup => {
        const text = this.getCleanText(sup);
        if (text) {
          sup.replaceWith(`^${text}^`); // Notation markdown alternative
        }
      });
      
      root.querySelectorAll('sub').forEach(sub => {
        const text = this.getCleanText(sub);
        if (text) {
          sub.replaceWith(`~${text}~`); // Notation markdown alternative
        }
      });
      
      // Center (centré) - Notion ne supporte pas, on met juste le texte
      root.querySelectorAll('center').forEach(center => {
        const text = this.getCleanText(center);
        if (text) {
          center.replaceWith(`\n${text}\n`);
        }
      });
      
      // Préserver les liens AVANT tout autre traitement
      root.querySelectorAll('a').forEach(a => {
        const text = this.getCleanText(a);
        const href = a.getAttribute('href');
        if (text && href && !href.startsWith('javascript:')) {
          // Marquer temporairement pour éviter la double conversion
          a.innerHTML = `§LINK§${text}§${href}§`;
        }
      });

      // Préserver les images
      root.querySelectorAll('img').forEach(img => {
        const alt = img.getAttribute('alt') || 'image';
        const src = img.getAttribute('src');
        if (src) {
          img.replaceWith(`§IMG§${alt}§${src}§`);
        }
      });

      // Traiter le formatage inline (dans le bon ordre)
      
      // Code inline (avant autres formatages pour éviter les conflits)
      root.querySelectorAll('code').forEach(el => {
        if (!el.closest('pre')) {
          const text = this.getCleanText(el);
          if (text) {
            el.innerHTML = `§CODE§${text}§`;
          }
        }
      });

      // Souligné (u, ins)
      root.querySelectorAll('u, ins').forEach(el => {
        const text = this.getCleanText(el);
        if (text) {
          el.innerHTML = `§UNDERLINE§${text}§`;
        }
      });

      // Barré (del, strike, s)
      root.querySelectorAll('del, strike, s').forEach(el => {
        const text = this.getCleanText(el);
        if (text) {
          el.innerHTML = `§STRIKE§${text}§`;
        }
      });

      // Gras (strong, b)
      root.querySelectorAll('strong, b').forEach(el => {
        const text = this.getCleanText(el);
        if (text) {
          el.innerHTML = `§BOLD§${text}§`;
        }
      });

      // Italique (em, i)
      root.querySelectorAll('em, i').forEach(el => {
        const text = this.getCleanText(el);
        if (text) {
          el.innerHTML = `§ITALIC§${text}§`;
        }
      });

      // Surlignage (mark)
      root.querySelectorAll('mark').forEach(el => {
        const text = this.getCleanText(el);
        if (text) {
          el.innerHTML = `§HIGHLIGHT§${text}§`;
        }
      });

      // 3. Traiter les blocs de code
      root.querySelectorAll('pre').forEach(pre => {
        const code = pre.querySelector('code') || pre;
        const text = code.textContent || code.innerText || '';
        if (text.trim()) {
          // Détecter le langage
          let lang = '';
          const classAttr = (code.getAttribute('class') || '') + ' ' + (pre.getAttribute('class') || '');
          const langMatch = classAttr.match(/language-(\w+)|lang-(\w+)|highlight-(\w+)/);
          if (langMatch) {
            lang = langMatch[1] || langMatch[2] || langMatch[3];
          }
          pre.replaceWith(`\n\n§CODEBLOCK§${lang}§${text}§\n\n`);
        }
      });

      // 4. Citations - Améliorer la gestion
      root.querySelectorAll('blockquote').forEach(bq => {
        // Récupérer tout le contenu interne en préservant les paragraphes
        const paragraphs = bq.querySelectorAll('p');
        let quoteText = '';
        
        if (paragraphs.length > 0) {
          // Si il y a des paragraphes, les traiter séparément
          paragraphs.forEach(p => {
            const text = this.getCleanText(p);
            if (text.trim()) {
              quoteText += `> ${text.trim()}\n`;
            }
          });
        } else {
          // Sinon prendre tout le texte
          const text = this.getCleanText(bq);
          if (text.trim()) {
            // Diviser par lignes et ajouter > devant chaque
            const lines = text.trim().split('\n');
            quoteText = lines.map(line => `> ${line.trim()}`).join('\n');
          }
        }
        
        if (quoteText) {
          bq.replaceWith(`\n\n${quoteText}\n\n`);
        }
      });

      // 5. Listes (traiter avant les paragraphes)
      
      // Listes non ordonnées
      root.querySelectorAll('ul').forEach(ul => {
        const items = [];
        ul.querySelectorAll('> li').forEach(li => {
          const text = this.getCleanText(li);
          if (text.trim()) {
            items.push(`• ${text.trim()}`);
          }
        });
        if (items.length > 0) {
          ul.replaceWith(`\n\n${items.join('\n')}\n\n`);
        }
      });

      // Listes ordonnées
      root.querySelectorAll('ol').forEach(ol => {
        const items = [];
        let counter = 1;
        const start = parseInt(ol.getAttribute('start') || '1');
        if (!isNaN(start)) counter = start;
        
        ol.querySelectorAll('> li').forEach(li => {
          const text = this.getCleanText(li);
          if (text.trim()) {
            items.push(`${counter}. ${text.trim()}`);
            counter++;
          }
        });
        if (items.length > 0) {
          ol.replaceWith(`\n\n${items.join('\n')}\n\n`);
        }
      });

      // Listes de définitions
      root.querySelectorAll('dl').forEach(dl => {
        let result = '\n\n';
        dl.querySelectorAll('dt').forEach(dt => {
          const term = this.getCleanText(dt);
          if (term) {
            result += `**${term.trim()}**\n`;
          }
        });
        dl.querySelectorAll('dd').forEach(dd => {
          const def = this.getCleanText(dd);
          if (def) {
            result += `:   ${def.trim()}\n`;
          }
        });
        dl.replaceWith(result + '\n');
      });

      // 6. Tableaux
      root.querySelectorAll('table').forEach(table => {
        let markdown = '\n\n';
        const rows = table.querySelectorAll('tr');
        
        if (rows.length > 0) {
          // Déterminer les colonnes
          const firstRow = rows[0];
          const cols = firstRow.querySelectorAll('th, td').length;
          
          // En-têtes
          const headerCells = firstRow.querySelectorAll('th');
          if (headerCells.length > 0) {
            markdown += '| ' + Array.from(headerCells).map(h => this.getCleanText(h).trim()).join(' | ') + ' |\n';
            markdown += '|' + Array(headerCells.length).fill('---').join('|') + '|\n';
            
            // Corps (commencer à la ligne 1)
            for (let i = 1; i < rows.length; i++) {
              const cells = rows[i].querySelectorAll('td, th');
              if (cells.length > 0) {
                markdown += '| ' + Array.from(cells).map(c => this.getCleanText(c).trim()).join(' | ') + ' |\n';
              }
            }
          } else {
            // Pas d'en-têtes, traiter toutes les lignes
            for (let i = 0; i < rows.length; i++) {
              const cells = rows[i].querySelectorAll('td');
              if (cells.length > 0) {
                if (i === 0) {
                  // Créer un header factice pour la première ligne
                  markdown += '| ' + Array.from(cells).map(c => this.getCleanText(c).trim()).join(' | ') + ' |\n';
                  markdown += '|' + Array(cells.length).fill('---').join('|') + '|\n';
                } else {
                  markdown += '| ' + Array.from(cells).map(c => this.getCleanText(c).trim()).join(' | ') + ' |\n';
                }
              }
            }
          }
        }
        
        table.replaceWith(markdown + '\n\n');
      });

      // 7. Titres
      for (let level = 6; level >= 1; level--) {
        root.querySelectorAll(`h${level}`).forEach(heading => {
          const text = this.getCleanText(heading);
          if (text.trim()) {
            heading.replaceWith(`\n\n${'#'.repeat(level)} ${text.trim()}\n\n`);
          }
        });
      }

      // 8. Règles horizontales
      root.querySelectorAll('hr').forEach(hr => {
        hr.replaceWith('\n\n---\n\n');
      });

      // 9. Paragraphes
      root.querySelectorAll('p').forEach(p => {
        const text = this.getCleanText(p);
        if (text.trim()) {
          p.replaceWith(`\n\n${text.trim()}\n\n`);
        }
      });

      // 10. Divs et autres conteneurs
      root.querySelectorAll('div, section, article, aside, main, header, footer, nav').forEach(el => {
        const text = this.getCleanText(el);
        if (text.trim()) {
          el.replaceWith(`\n${text.trim()}\n`);
        }
      });

      // 11. Sauts de ligne
      root.querySelectorAll('br').forEach(br => {
        br.replaceWith('  \n'); // Deux espaces pour un vrai saut de ligne en markdown
      });

      // Extraire le texte final
      let finalText = root.text || root.innerText || root.textContent || '';
      
      // Restaurer les marqueurs dans l'ordre inverse
      finalText = this.restoreMarkdown(finalText);

      // Nettoyer
      finalText = this.cleanupMarkdown(finalText);

      console.log(`✅ HTML converti: ${finalText.length} caractères`);
      return finalText;

    } catch (error) {
      console.error('❌ Erreur conversion HTML:', error);
      // Fallback basique
      return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  /**
   * Obtient le texte propre d'un élément
   */
  getCleanText(element) {
    if (!element) return '';
    
    // Obtenir le texte interne en préservant la structure
    let text = element.innerHTML || element.textContent || element.text || '';
    
    // Nettoyer les tags HTML restants mais préserver nos marqueurs
    text = text.replace(/<(?!§)[^>]+>/g, ' ');
    
    return text.trim();
  }

  /**
   * Restaure les marqueurs en markdown
   */
  restoreMarkdown(text) {
    // Restaurer dans l'ordre spécifique pour éviter les conflits
    
    // Blocs de code (priorité haute)
    text = text.replace(/§CODEBLOCK§([^§]*)§([^§]*)§/g, (match, lang, code) => {
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    });
    
    // Code inline
    text = text.replace(/§CODE§([^§]+)§/g, '`$1`');
    
    // Liens - Vérifier la validité
    text = text.replace(/§LINK§([^§]+)§([^§]+)§/g, (match, linkText, url) => {
      // Si l'URL est invalide, retourner juste le texte
      if (!url || url === 'undefined' || url === 'null' || url.startsWith('javascript:')) {
        return linkText;
      }
      return `[${linkText}](${url})`;
    });
    
    // Images
    text = text.replace(/§IMG§([^§]+)§([^§]+)§/g, '![$1]($2)');
    
    // Citations - Correction pour gérer les multi-lignes
    text = text.replace(/§QUOTE§([^§]+)§/g, (match, quote) => {
      const lines = quote.split('\n').filter(l => l.trim());
      return lines.map(line => `> ${line.trim()}`).join('\n');
    });
    
    // Formatage (l'ordre est important)
    text = text.replace(/§BOLD§([^§]+)§/g, '**$1**');
    text = text.replace(/§ITALIC§([^§]+)§/g, '*$1*');
    text = text.replace(/§UNDERLINE§([^§]+)§/g, '**__$1__**'); // Notion comprend mieux cette syntaxe
    text = text.replace(/§STRIKE§([^§]+)§/g, '~~$1~~');
    text = text.replace(/§HIGHLIGHT§([^§]+)§/g, '**$1**'); // Fallback en gras car Notion ne supporte pas le surlignage
    
    return text;
  }

  /**
   * Nettoie le markdown final
   */
  cleanupMarkdown(text) {
    // Gérer les notes de bas de page (non supportées par Notion)
    // Convertir [^1] en (1) et mettre les notes à la fin
    const footnotes = {};
    let footnoteCounter = 1;
    
    // Collecter les définitions de notes
    text = text.replace(/\[\^(\d+)\]:\s*(.+)$/gm, (match, num, content) => {
      footnotes[num] = content;
      return ''; // Supprimer temporairement
    });
    
    // Remplacer les références
    text = text.replace(/\[\^(\d+)\]/g, (match, num) => {
      if (footnotes[num]) {
        return `(${num})`;
      }
      return match;
    });
    
    // Ajouter les notes à la fin si elles existent
    if (Object.keys(footnotes).length > 0) {
      text += '\n\n---\n\n**Notes:**\n\n';
      for (const [num, content] of Object.entries(footnotes)) {
        text += `(${num}) ${content}\n\n`;
      }
    }
    
    // Décoder les entités HTML
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
      .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

    // Nettoyer les espaces et sauts de ligne
    text = text
      .replace(/\n{4,}/g, '\n\n\n')        // Max 3 sauts de ligne
      .replace(/^[ \t]+/gm, '')             // Espaces en début de ligne
      .replace(/[ \t]+$/gm, '')             // Espaces en fin de ligne
      .replace(/[ \t]{2,}/g, ' ')          // Espaces multiples
      .trim();

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
        console.log('📸 Image détectée dans le clipboard');
        
        // Obtenir le buffer PNG directement
        const buffer = image.toPNG();
        
        // ✅ FIX : Créer l'objet directement sans appeler detect()
        const enriched = {
          type: 'image',
          subtype: 'screenshot',
          data: buffer,              // Buffer pour upload
          content: buffer,           // Buffer pour traitement
          preview: image.toDataURL(), // Data URL pour UI uniquement
          size: image.getSize(),
          bufferSize: buffer.length,
          timestamp: Date.now()
        };
        enriched.hash = this.calculateHash(enriched);
        
        console.log(`📊 Image: ${(buffer.length / 1024).toFixed(2)} KB`);
        return enriched;
      }

      // HTML et texte
      const html = clipboard.readHTML();
      const text = clipboard.readText();
      
      // Si on a du HTML avec des tags
      if (html && html.trim() && /<[^>]+>/.test(html)) {
        console.log('📋 HTML détecté, conversion complète...');
        
        // Convertir le HTML en markdown
        let markdownText = this.convertHTMLToMarkdown(html);
        
        // Si la conversion échoue, utiliser le texte brut
        if (!markdownText || markdownText.trim().length === 0) {
          console.log('⚠️ Conversion vide, utilisation du texte brut');
          markdownText = text || html.replace(/<[^>]+>/g, ' ').trim();
        }
        
        const detection = require('./contentDetector').detect(markdownText);
        
        return {
          type: detection.type || 'markdown',
          subtype: detection.subtype,
          data: markdownText,
          content: markdownText,  // Pour React
          text: markdownText,
          wasHtml: true,
          originalLength: markdownText.length,
          length: markdownText.length,
          confidence: detection.confidence,
          metadata: detection.metadata,
          timestamp: Date.now(),
          hash: this.calculateHash({ data: markdownText })
        };
      }

      // Texte simple
      if (text && text.trim()) {
        const detection = require('./contentDetector').detect(text);
        
        return {
          type: detection.type || 'text',
          subtype: detection.subtype,
          data: text,
          content: text,  // Pour React
          text: text,
          length: text.length,
          confidence: detection.confidence,
          metadata: detection.metadata,
          timestamp: Date.now(),
          hash: this.calculateHash({ data: text })
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur récupération contenu:', error);
      // Fallback au texte brut
      const fallbackText = clipboard.readText();
      if (fallbackText) {
        return {
          type: 'text',
          data: fallbackText,
          content: fallbackText,
          text: fallbackText,
          length: fallbackText.length,
          timestamp: Date.now(),
          hash: this.calculateHash({ data: fallbackText })
        };
      }
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
  }

  /**
   * Vérifie si le contenu a changé
   */
  hasChanged() {
    const current = this.getContent();
    if (!current) return false;

    const currentHash = current?.hash || this.calculateHash(current);
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
    
    let dataPreview;
    
    if (Buffer.isBuffer(content.data)) {
      dataPreview = `buffer_${content.data.length}`;
    } else if (typeof content.data === 'string') {
      dataPreview = content.data.substring(0, 1000);
    } else {
      dataPreview = String(content.data).substring(0, 1000);
    }
    
    const str = JSON.stringify({
      type: content.type,
      data: dataPreview,
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
}

module.exports = new ClipboardService();