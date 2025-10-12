export class ContentSanitizer {
  private static instance = new ContentSanitizer();

  static sanitizeText(text: string): string {
    return this.instance.sanitize(text);
  }

  static sanitizeUrl(url: string): string {
    return this.instance.isValidUrl(url) ? url : '';
  }
  /**
   * Sanitize content to prevent XSS and other security issues
   */
  sanitize(content: string): string {
    if (!content) return '';
    
    // Remove HTML tags
    let sanitized = this.removeHtmlTags(content);
    
    // Sanitize URLs
    sanitized = this.sanitizeUrls(sanitized);
    
    // Remove dangerous scripts
    sanitized = this.removeDangerousScripts(sanitized);
    
    // Sanitize Unicode
    sanitized = this.sanitizeUnicode(sanitized);
    
    // Sanitize formulas
    sanitized = this.sanitizeFormula(sanitized);
    
    return sanitized;
  }

  /**
   * Remove HTML tags from content
   */
  private removeHtmlTags(content: string): string {
    // Remove HTML tags but preserve < and > that are not tags
    return content.replace(/<[^>]+>/g, '');
  }

  /**
   * Sanitize URLs to prevent malicious links
   */
  private sanitizeUrls(content: string): string {
    // First handle javascript: and other dangerous protocols
    let sanitized = content.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    sanitized = sanitized.replace(/data:text\/html/gi, '');
    
    const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    
    return sanitized.replace(urlPattern, (match) => {
      if (this.isValidUrl(match)) {
        return match;
      }
      return '[URL removed for security]';
    });
  }

  /**
   * Remove dangerous scripts and event handlers
   */
  private removeDangerousScripts(content: string): string {
    const dangerousPatterns = [
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /onclick=/gi,
      /onload=/gi,
      /onerror=/gi,
      /onmouseover=/gi,
      /onfocus=/gi,
      /onblur=/gi,
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
      /<object[^>]*>[\s\S]*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /<applet[^>]*>[\s\S]*?<\/applet>/gi
    ];

    let sanitized = content;
    for (const pattern of dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  /**
   * Validate URL format and protocol
   */
  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const allowedProtocols = ['http:', 'https:', 'ftp:', 'mailto:'];
      return allowedProtocols.includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Sanitize table content to prevent formula injection
   */
  sanitizeTableContent(content: string): string {
    // Retirer les tags HTML
    let sanitized = content.replace(/<[^>]*>/g, '');
    
    // Retirer les formules Excel dangereuses
    if (sanitized.match(/^[=+@-]/)) {
      sanitized = "'" + sanitized; // Préfixer pour désactiver les formules
    }
    
    // Retirer les commandes système
    sanitized = sanitized.replace(/cmd\|/gi, '')
                        .replace(/HYPERLINK/gi, '')
                        .replace(/javascript:/gi, '')
                        .replace(/onclick=/gi, '');
    
    return sanitized;
  }

  /**
   * Sanitize Unicode characters to prevent homograph attacks
   */
  sanitizeUnicode(content: string): string {
    // Normaliser Unicode
    const normalized = content.normalize('NFC');
    
    // Retirer les caractères de contrôle invisibles
    let cleaned = normalized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // Retirer les caractères zero-width et autres invisibles
    cleaned = cleaned.replace(/[\u200B-\u200F\uFEFF\u202E]/g, '');
    
    // Détecter et nettoyer les homographes
    return cleaned.replace(/[а-яА-Я]/g, (match) => {
      // Convertir les caractères cyrilliques qui ressemblent à du latin
      const cyrillicToLatin: { [key: string]: string } = {
        'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 
        'с': 'c', 'у': 'y', 'х': 'x'
      };
      return cyrillicToLatin[match.toLowerCase()] || match;
    });
  }

  /**
   * Sanitize formula content to prevent injection
   */
  sanitizeFormula(content: string): string {
    // Prevent formula injection by prefixing dangerous characters
    if (content.match(/^[=@+\-]/)) {
      return "'" + content;
    }
    return content;
  }

  /**
   * Sanitize rich text content
   */
  sanitizeRichText(richText: any[]): any[] {
    if (!Array.isArray(richText)) return richText;
    
    return richText.map(item => {
      if (item.type === 'text' && item.text?.content) {
        return {
          ...item,
          text: {
            ...item.text,
            content: this.sanitize(item.text.content)
          }
        };
      }
      
      if (item.href && !this.isValidUrl(item.href)) {
        item.href = null;
      }
      
      return item;
    });
  }

  /**
   * Sanitize block content recursively
   */
  sanitizeBlock(block: any): any {
    if (!block || typeof block !== 'object') return block;
    
    const sanitizedBlock = { ...block };
    
    // Sanitize rich text fields
    const richTextFields = this.getRichTextFields(block.type);
    for (const field of richTextFields) {
      const richText = this.getNestedProperty(sanitizedBlock, field);
      if (Array.isArray(richText)) {
        this.setNestedProperty(sanitizedBlock, field, this.sanitizeRichText(richText));
      }
    }
    
    // Sanitize URLs in media blocks
    if (block.type === 'image' || block.type === 'video' || block.type === 'audio') {
      const mediaField = sanitizedBlock[block.type];
      if (mediaField?.external?.url) {
        if (!this.isValidUrl(mediaField.external.url)) {
          mediaField.external.url = '';
        }
      }
    }
    
    // Sanitize bookmark URLs
    if (block.type === 'bookmark' && sanitizedBlock.bookmark?.url) {
      if (!this.isValidUrl(sanitizedBlock.bookmark.url)) {
        sanitizedBlock.bookmark.url = '';
      }
    }
    
    // Sanitize table content
    if (block.type === 'table' && sanitizedBlock.table?.children) {
      sanitizedBlock.table.children = sanitizedBlock.table.children.map((row: any) => {
        if (row.type === 'table_row' && row.table_row?.cells) {
          row.table_row.cells = row.table_row.cells.map((cell: any[]) => {
            return cell.map((richTextItem: any) => {
              if (richTextItem.type === 'text' && richTextItem.text?.content) {
                richTextItem.text.content = this.sanitizeTableContent(richTextItem.text.content);
              }
              return richTextItem;
            });
          });
        }
        return row;
      });
    }
    
    // Recursively sanitize children
    if (sanitizedBlock.children) {
      sanitizedBlock.children = sanitizedBlock.children.map((child: any) => 
        this.sanitizeBlock(child)
      );
    }
    
    return sanitizedBlock;
  }

  private getRichTextFields(blockType: string): string[] {
    switch (blockType) {
      case 'paragraph':
        return ['paragraph.rich_text'];
      case 'heading_1':
        return ['heading_1.rich_text'];
      case 'heading_2':
        return ['heading_2.rich_text'];
      case 'heading_3':
        return ['heading_3.rich_text'];
      case 'bulleted_list_item':
        return ['bulleted_list_item.rich_text'];
      case 'numbered_list_item':
        return ['numbered_list_item.rich_text'];
      case 'to_do':
        return ['to_do.rich_text'];
      case 'toggle':
        return ['toggle.rich_text'];
      case 'quote':
        return ['quote.rich_text'];
      case 'callout':
        return ['callout.rich_text'];
      case 'code':
        // Les blocs de code ne doivent pas être sanitisés pour préserver le formatage
        return [];
      default:
        return [];
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}