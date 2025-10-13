import type { ASTNode, NotionBlock, NotionColor, ConversionOptions } from '../types';
import { RichTextConverter } from './RichTextConverter';

export class NotionConverter {
  private richTextConverter = new RichTextConverter();

  // Mapping des langages vers les noms acceptés par Notion API
  private languageMapping: { [key: string]: string } = {
    'csharp': 'c#',
    'cs': 'c#',
    'dotnet': 'c#',
    'fsharp': 'f#',
    'fs': 'f#',
    'cplusplus': 'c++',
    'cpp': 'c++',
    'cxx': 'c++',
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'ps1': 'powershell',
    'pwsh': 'powershell',
    'yml': 'yaml',
    'tex': 'latex',
    'md': 'markdown',
    'htm': 'html',
    'xhtml': 'html',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'vue': 'javascript',
    'svelte': 'javascript'
  };

  convert(nodes: ASTNode[], options: ConversionOptions = {}): NotionBlock[] {
    const blocks: NotionBlock[] = [];

    for (const node of nodes) {
      // ✅ ARCHITECTURE CORRIGÉE : Convertir et aplatir récursivement
      this.convertNodeFlat(node, options, blocks);
    }

    // ✅ VALIDATION : Filtrer les blocs malformés
    const validBlocks = blocks.filter(block => this.isValidNotionBlock(block));

    if (validBlocks.length !== blocks.length) {
      console.warn(`[NotionConverter] Filtered ${blocks.length - validBlocks.length} invalid blocks`);
    }

    return validBlocks;
  }

  /**
   * Convertit un nœud et ajoute tous ses blocs (parent + enfants) à la liste de blocs
   * ✅ CORRIGÉ: Format plat compatible avec l'API Notion, mais préserve l'information de hiérarchie
   */
  private convertNodeFlat(node: ASTNode, options: ConversionOptions, blocks: NotionBlock[]): void {
    const block = this.convertNode(node, options);
    if (!block) return;

    // Ajouter le bloc parent
    blocks.push(block);

    // Si le nœud a des enfants, les convertir et les ajouter au même niveau
    // L'API Notion gère la hiérarchie via has_children et des appels séparés
    if (node.children && node.children.length > 0) {
      // Marquer le parent comme ayant des enfants
      (block as any).has_children = true;

      // Convertir récursivement les enfants et les ajouter au même niveau
      // C'est le format attendu par l'API Notion
      for (const child of node.children) {
        this.convertNodeFlat(child, options, blocks);
      }
    }
  }



  private convertNode(node: ASTNode, options: ConversionOptions): NotionBlock | null {
    switch (node.type) {
      case 'text':
        return this.convertText(node, options);
      case 'heading':
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return this.convertHeading(node, options);
      case 'list_item':
        return this.convertListItem(node, options);
      case 'code':
        return this.convertCode(node, options);
      case 'table':
        return this.convertTable(node, options);
      case 'callout':
        return this.convertCallout(node, options);
      case 'image':
      case 'video':
      case 'audio':
      case 'file':
        return this.convertMedia(node, options);
      case 'equation':
        return this.convertEquation(node, options);
      case 'quote':
        return this.convertQuote(node, options);
      case 'divider':
        return this.convertDivider();
      case 'toggle':
        return this.convertToggle(node, options);
      case 'bookmark':
        return this.convertBookmark(node, options);
      default:
        console.warn(`[NotionConverter] Unknown node type: ${node.type}`, node);
        return null;
    }
  }

  private normalizeLanguage(language: string): string {
    const normalized = language.toLowerCase().trim();
    return this.languageMapping[normalized] || normalized;
  }

  private convertText(node: ASTNode, options: ConversionOptions): NotionBlock {
    const richText = options.preserveFormatting
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    return {
      type: 'paragraph',
      paragraph: {
        rich_text: richText,
        color: (node.metadata?.color as NotionColor) || 'default'
      }
    };
  }

  private convertHeading(node: ASTNode, options: ConversionOptions): NotionBlock {
    // Déterminer le niveau depuis le type ou metadata
    let level: 1 | 2 | 3;
    if (node.type === 'heading_1') level = 1;
    else if (node.type === 'heading_2') level = 2;
    else if (node.type === 'heading_3') level = 3;
    else level = node.metadata?.level || 1;

    const type = `heading_${level}` as const;
    const richText = options.preserveFormatting
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    const block: any = {
      type,
      [type]: {
        rich_text: richText,
        color: (node.metadata?.color as NotionColor) || 'default',
        is_toggleable: node.metadata?.isToggleable || false
      }
    };

    // ✅ Children gérés par convertNodeFlat() - ne pas les ajouter ici
    return block;
  }

  private convertListItem(node: ASTNode, options: ConversionOptions): NotionBlock {
    const richText = options.preserveFormatting
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    // Determine list type from metadata or parent
    const listType = node.metadata?.listType || 'bulleted';
    const checked = node.metadata?.checked;

    let block: NotionBlock;

    if (listType === 'todo') {
      block = {
        type: 'to_do',
        to_do: {
          rich_text: richText,
          checked: checked || false,
          color: (node.metadata?.color as NotionColor) || 'default'
        }
      };
    } else if (listType === 'numbered') {
      block = {
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: richText,
          color: (node.metadata?.color as NotionColor) || 'default'
        }
      };
    } else {
      block = {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: richText,
          color: (node.metadata?.color as NotionColor) || 'default'
        }
      };
    }

    // ✅ Children gérés par convertNodeFlat() - ne pas les ajouter ici
    return block;
  }

  private convertCode(node: ASTNode, _options: ConversionOptions): NotionBlock {
    const rawLanguage = node.metadata?.language || 'plain text';
    const language = this.normalizeLanguage(rawLanguage);
    const isBlock = node.metadata?.isBlock !== false;

    if (isBlock) {
      return {
        type: 'code',
        code: {
          rich_text: [{
            type: 'text',
            text: { content: node.content || '' }
          }],
          language,
          caption: []
        }
      };
    } else {
      // Inline code - convert to paragraph with code formatting
      return {
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: node.content || '' },
            annotations: { code: true }
          }],
          color: 'default'
        }
      };
    }
  }

  private convertTable(node: ASTNode, _options: ConversionOptions): NotionBlock {
    const headers = node.metadata?.headers || [];
    const rows = node.metadata?.rows || [];
    const tableWidth = headers.length;

    const tableRows: any[] = [];

    // Header row
    if (headers.length > 0) {
      tableRows.push({
        type: 'table_row',
        table_row: {
          cells: headers.map((header: string) => [{
            type: 'text',
            text: { content: header }
          }])
        }
      });
    }

    // Data rows
    for (const row of rows) {
      const normalizedRow = [...row];
      while (normalizedRow.length < tableWidth) normalizedRow.push('');
      if (normalizedRow.length > tableWidth) normalizedRow.length = tableWidth;

      tableRows.push({
        type: 'table_row',
        table_row: {
          cells: normalizedRow.map(cell => [{
            type: 'text',
            text: { content: cell }
          }])
        }
      });
    }

    return {
      type: 'table',
      table: {
        table_width: tableWidth,
        has_column_header: node.metadata?.hasColumnHeader !== false,
        has_row_header: node.metadata?.hasRowHeader || false,
        children: tableRows
      }
    };
  }

  private convertCallout(node: ASTNode, options: ConversionOptions): NotionBlock {
    const richText = options.preserveFormatting
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    return {
      type: 'callout',
      callout: {
        rich_text: richText,
        icon: {
          type: 'emoji',
          emoji: node.metadata?.icon || '💡'
        },
        color: (node.metadata?.color as NotionColor) || 'gray_background'
      }
    };
  }

  /**
   * ✅ Logique de fallback améliorée avec validation différenciée
   */
  private convertMedia(node: ASTNode, options: ConversionOptions): NotionBlock {
    const url = node.metadata?.url || '';
    const caption = node.metadata?.caption;

    if (!url) {
      return this.convertText({ type: 'text', content: node.content || '' }, options);
    }

    // Check conversion options
    if (node.type === 'image' && options.convertImages === false) {
      const imageText = caption ? `![${caption}](${url})` : `![image](${url})`;
      return this.convertText({ type: 'text', content: imageText }, options);
    }

    if (node.type === 'video' && options.convertVideos === false) {
      const videoText = caption ? `[${caption}](${url})` : `[video](${url})`;
      return this.convertText({ type: 'text', content: videoText }, options);
    }

    const captionRichText = caption ? [{
      type: 'text' as const,
      text: { content: caption }
    }] : [];

    // Ordre de détection :
    // 1. Audio (permissif pour fichiers réels)
    // 2. Video (stricte, seulement plateformes)
    // 3. Fallback vers bookmark

    if (this.isValidAudioUrl(url)) {
      return {
        type: 'audio',
        audio: { 
          type: 'external', 
          external: { url },
          caption: captionRichText
        }
      };
    }

    if (this.isValidVideoUrl(url)) {
      return {
        type: 'video',
        video: { 
          type: 'external', 
          external: { url }
        }
      };
    }

    // Handle images separately
    if (node.type === 'image') {
      return {
        type: 'image',
        image: {
          type: 'external',
          external: { url },
          caption: captionRichText
        }
      };
    }

    // Handle PDFs
    if (node.type === 'file' && url.toLowerCase().endsWith('.pdf')) {
      return {
        type: 'pdf',
        pdf: {
          type: 'external',
          external: { url },
          caption: captionRichText
        }
      };
    }

    // ❌ Ni audio ni video valide → bookmark
    console.warn(`[NotionConverter] URL not valid for audio/video, creating bookmark: ${url}`);
    return {
      type: 'bookmark',
      bookmark: { 
        url,
        caption: captionRichText
      }
    };
  }

  private convertEquation(node: ASTNode, _options: ConversionOptions): NotionBlock {
    const isBlock = node.metadata?.isBlock !== false;
    const expression = node.content || '';

    if (isBlock) {
      return {
        type: 'equation',
        equation: {
          expression
        }
      };
    } else {
      // Inline equation - convert to paragraph with equation
      return {
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'equation',
            equation: { expression }
          }],
          color: 'default'
        }
      };
    }
  }

  private convertQuote(node: ASTNode, options: ConversionOptions): NotionBlock {
    const richText = options.preserveFormatting
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    return {
      type: 'quote',
      quote: {
        rich_text: richText,
        color: (node.metadata?.color as NotionColor) || 'default'
      }
    };
  }

  private convertDivider(): NotionBlock {
    return {
      type: 'divider',
      divider: {}
    };
  }

  private convertToggle(node: ASTNode, options: ConversionOptions): NotionBlock {
    const richText = options.preserveFormatting
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    const block: NotionBlock = {
      type: 'toggle',
      toggle: {
        rich_text: richText,
        color: (node.metadata?.color as NotionColor) || 'default'
      }
    };

    // ✅ Children gérés par convertNodeFlat() - ne pas les ajouter ici
    return block;
  }

  private convertBookmark(node: ASTNode, options: ConversionOptions): NotionBlock {
    const url = node.metadata?.url;
    const caption = node.metadata?.title || node.metadata?.description;

    if (!url) {
      return this.convertText({ type: 'text', content: node.content || url || '' }, options);
    }

    return {
      type: 'bookmark',
      bookmark: {
        url,
        caption: caption ? [{
          type: 'text',
          text: { content: caption }
        }] : []
      }
    };
  }

  /**
   * Valide qu'un bloc Notion a la structure correcte
   */
  private isValidNotionBlock(block: any): boolean {
    if (!block || !block.type) {
      console.warn(`[NotionConverter] Invalid block: missing type`, block);
      return false;
    }

    // Vérifier que le bloc a la propriété correspondante à son type
    const requiredProperty = block.type;

    // Types spéciaux qui n'ont pas de propriété correspondante
    const specialTypes = ['divider', 'breadcrumb', 'table_of_contents'];

    if (specialTypes.includes(block.type)) {
      return true;
    }

    // Pour tous les autres types, la propriété doit exister
    if (!block[requiredProperty]) {
      console.warn(`[NotionConverter] Invalid block: type '${block.type}' missing property '${requiredProperty}'`);
      console.warn(`[NotionConverter] Available properties:`, Object.keys(block));
      console.warn(`[NotionConverter] Full block:`, JSON.stringify(block, null, 2));
      return false;
    }

    // ✅ VALIDATION SUPPLÉMENTAIRE: Vérifier les propriétés orphelines
    const validRootProperties = [block.type, 'has_children', 'type'];
    const orphanProperties = Object.keys(block).filter(key => !validRootProperties.includes(key));

    if (orphanProperties.length > 0) {
      console.warn(`[NotionConverter] Invalid block: orphan properties at root level: ${orphanProperties.join(', ')}`);
      console.warn(`[NotionConverter] These should be inside '${requiredProperty}' property`);
      console.warn(`[NotionConverter] Full block:`, JSON.stringify(block, null, 2));
      return false;
    }

    return true;
  }

  /**
   * ✅ VALIDATION STRICTE pour les vidéos
   * ❌ Les MP4 peuvent avoir des problèmes de compression
   * ✅ Les vidéos doivent venir de sources d'embedding connues
   */
  private isValidVideoUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // ✅ STRICTE : Seulement les plateformes d'embedding connues
      const validVideoHosts = [
        'youtube.com',
        'www.youtube.com',
        'youtu.be',
        'vimeo.com',
        'www.vimeo.com',
        'dailymotion.com',
        'www.dailymotion.com',
        'twitch.tv',
        'www.twitch.tv'
      ];
      
      // Si c'est un fichier MP4 direct, REJETER (trop de risques)
      if (url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov')) {
        console.warn(`[NotionConverter] Direct video files are not reliably supported, use embedding platforms instead: ${url}`);
        return false;
      }
      
      // Accepter SEULEMENT les plateformes connues
      return validVideoHosts.includes(hostname);
      
    } catch (error) {
      return false;
    }
  }

  /**
   * ✅ VALIDATION PERMISSIVE pour l'audio
   * Les formats audio sont bien supportés par Notion
   */
  private isValidAudioUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      
      // ✅ Formats audio supportés par Notion
      const validAudioExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
      
      // Vérifier l'extension
      const hasValidExtension = validAudioExtensions.some(ext => pathname.endsWith(ext));
      
      if (!hasValidExtension) {
        return false;
      }
      
      // ✅ PERMISSIF : Accepter n'importe quel domaine avec protocole valide
      const validProtocols = ['http:', 'https:'];
      if (!validProtocols.includes(urlObj.protocol)) {
        return false;
      }
      
      // ✅ Accepter les domaines réels (pas localhost, pas example.com)
      const invalidHosts = ['localhost', '127.0.0.1', 'example.com', 'test.com'];
      if (invalidHosts.includes(urlObj.hostname.toLowerCase())) {
        console.warn(`[NotionConverter] Invalid audio host for production: ${url}`);
        return false;
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }
}