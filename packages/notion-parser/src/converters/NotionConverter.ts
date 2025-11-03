import type { ASTNode, NotionBlock, NotionColor, ConversionOptions } from '../types';
import { RichTextBuilder } from './RichTextBuilder';
import type { NotionRichText } from '../types/notion';

export class NotionConverter {

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

    // ✅ NETTOYAGE : Supprimer les propriétés internes avant validation
    const cleanedBlocks = blocks.map(block => this.cleanBlock(block));

    // ✅ VALIDATION : Filtrer les blocs malformés
    const validBlocks = cleanedBlocks.filter(block => this.isValidNotionBlock(block));

    if (validBlocks.length !== cleanedBlocks.length) {
      console.warn(`[NotionConverter] Filtered ${cleanedBlocks.length - validBlocks.length} invalid blocks`);
    }

    return validBlocks;
  }

  /**
   * Convertit un nœud et ajoute tous ses blocs (parent + enfants) à la liste de blocs
   * ✅ CORRIGÉ: Format plat compatible avec l'API Notion, mais préserve l'information de hiérarchie
   */
  private convertNodeFlat(node: ASTNode, options: ConversionOptions, blocks: NotionBlock[]): void {
    // ✅ CAS SPÉCIAL: list_container - traiter directement les enfants
    if (node.type === 'list_container') {
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          this.convertNodeFlat(child, options, blocks);
        }
      }
      return;
    }

    const block = this.convertNode(node, options);
    if (!block) {
      // Si pas de bloc généré, traiter quand même les enfants
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          this.convertNodeFlat(child, options, blocks);
        }
      }
      return;
    }

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
      case 'paragraph':
        return this.convertText(node, options);
      case 'heading':
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return this.convertHeading(node, options);
      case 'list_item':
        return this.convertListItem(node, options);
      case 'list_container':
        // Les list_container sont gérés par convertNodeFlat qui traite les enfants
        return null;
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

  /**
   * ✅ Conversion des paragraphes
   */
  private convertText(node: ASTNode, options: ConversionOptions): NotionBlock {
    let richText: NotionRichText[];
    if (node.metadata?.richText) {
      richText = node.metadata.richText;
    } else {
      richText = RichTextBuilder.fromMarkdown(node.content || '');
    }

    return {
      type: 'paragraph',
      paragraph: {
        rich_text: richText,
        color: 'default'
      }
    };
  }

  /**
   * ✅ AMÉLIORATION - Utilise le rich text déjà parsé
   */
  private convertHeading(node: ASTNode, options: ConversionOptions): NotionBlock {
    const level = node.metadata?.level || 1;
    const type = `heading_${level}` as 'heading_1' | 'heading_2' | 'heading_3';

    // ✅ Utiliser le rich text déjà parsé par le parser
    let richText: NotionRichText[];
    if (node.metadata?.richText) {
      richText = node.metadata.richText;
    } else {
      // Fallback si pas de rich text parsé
      richText = RichTextBuilder.fromMarkdown(node.content || '');
    }

    const block: any = {
      type: type,
      [type]: {
        rich_text: richText,
        color: (node.metadata?.color as NotionColor) || 'default'
      }
    };

    // ✅ VÉRIFICATION CRITIQUE: Ajouter is_toggleable si présent
    if (node.metadata?.isToggleable === true) {
      console.debug('[convertHeading] Adding is_toggleable to heading:', {
        type: type,
        content: node.content?.substring(0, 50)
      });
      block[type].is_toggleable = true;
    }

    // ✅ VÉRIFICATION CRITIQUE: Marquer has_children si enfants présents
    if (node.children && node.children.length > 0) {
      console.debug('[convertHeading] Marking heading with has_children:', {
        type: type,
        childrenCount: node.children.length
      });
      block.has_children = true;
      // Note: Les enfants seront ajoutés séparément par l'API Notion
    }

    console.debug('[convertHeading] Final block:', {
      type: block.type,
      isToggleable: block[type].is_toggleable,
      hasChildren: block.has_children
    });

    return block;
  }

  /**
   * ✅ AMÉLIORATION - Conversion des list items avec support de l'indentation API Notion 2025
   */
  private convertListItem(node: ASTNode, options: ConversionOptions): NotionBlock {
    const listType = node.metadata?.listType || 'bulleted';

    let richText: NotionRichText[];
    if (node.metadata?.richText) {
      richText = node.metadata.richText;
    } else {
      richText = RichTextBuilder.fromMarkdown(node.content || '');
    }

    let blockType: string;
    let blockContent: any;

    if (listType === 'todo') {
      blockType = 'to_do';
      blockContent = {
        rich_text: richText,
        checked: node.metadata?.checked || false,
        color: 'default'
      };
    } else if (listType === 'numbered') {
      blockType = 'numbered_list_item';
      blockContent = {
        rich_text: richText,
        color: 'default'
      };
    } else {
      blockType = 'bulleted_list_item';
      blockContent = {
        rich_text: richText,
        color: 'default'
      };
    }

    // ✅ Support des toggle lists
    if (node.metadata?.isToggleable === true) {
      console.debug('[convertListItem] Adding is_toggleable:', {
        type: blockType,
        content: node.content?.substring(0, 50)
      });
      blockContent.is_toggleable = true;
    }

    const block: any = {
      type: blockType,
      [blockType]: blockContent
    };

    // ✅ Support de l'indentation via children
    if (node.children && node.children.length > 0) {
      console.debug('[convertListItem] Marking list item with has_children:', {
        type: blockType,
        childrenCount: node.children.length
      });
      block.has_children = true;
      // Note: Les enfants seront ajoutés séparément par l'API Notion via des appels children
    }

    // ✅ Préserver les métadonnées d'indentation pour le helper
    if (node.metadata?.indentLevel !== undefined) {
      (block as any)._indentLevel = node.metadata.indentLevel;
    }

    console.debug('[convertListItem] Final block:', {
      type: block.type,
      isToggleable: blockContent.is_toggleable,
      hasChildren: block.has_children,
      indentLevel: node.metadata?.indentLevel
    });

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
    
    // ✅ FIX: Calculer la largeur du tableau en prenant le maximum entre headers et la plus grande ligne
    let tableWidth = headers.length;
    
    // Si pas d'headers, utiliser la largeur de la plus grande ligne
    if (tableWidth === 0 && rows.length > 0) {
      tableWidth = Math.max(...rows.map((row: any) => Array.isArray(row) ? row.length : 0));
    }
    
    // ✅ VALIDATION RENFORCÉE: S'assurer que tableWidth >= 1 (requis par l'API Notion)
    if (tableWidth === 0) {
      console.warn('[NotionConverter] Table has no columns, converting to paragraph');
      return {
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: 'Tableau vide (aucune colonne détectée)' }
          }],
          color: 'default'
        }
      };
    }

    // ✅ VALIDATION SUPPLÉMENTAIRE: Vérifier que les rows sont valides
    const validRows = rows.filter((row: any) => Array.isArray(row) && row.length > 0);
    
    if (validRows.length === 0 && headers.length === 0) {
      console.warn('[NotionConverter] Table has no valid rows or headers, converting to paragraph');
      return {
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: 'Tableau vide (aucune donnée valide)' }
          }],
          color: 'default'
        }
      };
    }

    const tableRows: any[] = [];

    // Header row (seulement si on a des headers)
    if (headers.length > 0) {
      // ✅ FIX: Normaliser les headers à la largeur du tableau
      const normalizedHeaders = [...headers];
      while (normalizedHeaders.length < tableWidth) normalizedHeaders.push('');
      if (normalizedHeaders.length > tableWidth) normalizedHeaders.length = tableWidth;
      
      tableRows.push({
        type: 'table_row',
        table_row: {
          cells: normalizedHeaders.map((header: string) => 
            RichTextBuilder.fromMarkdown(header || '')
          )
        }
      });
    }

    // Data rows - utiliser seulement les rows valides
    for (const row of validRows) {
      const normalizedRow = [...row];
      while (normalizedRow.length < tableWidth) normalizedRow.push('');
      if (normalizedRow.length > tableWidth) normalizedRow.length = tableWidth;

      tableRows.push({
        type: 'table_row',
        table_row: {
          cells: normalizedRow.map(cell => 
            RichTextBuilder.fromMarkdown(String(cell || ''))
          )
        }
      });
    }

    // ✅ VALIDATION: S'assurer qu'on a au moins une ligne
    if (tableRows.length === 0) {
      console.warn('[NotionConverter] Table has no rows, converting to paragraph');
      return {
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: 'Table vide (aucune ligne détectée)' }
          }],
          color: 'default'
        }
      };
    }

    console.debug('[NotionConverter] Creating table:', {
      tableWidth,
      hasHeaders: headers.length > 0,
      rowCount: tableRows.length,
      hasColumnHeader: node.metadata?.hasColumnHeader !== false
    });

    return {
      type: 'table',
      table: {
        table_width: tableWidth,
        has_column_header: node.metadata?.hasColumnHeader !== false && headers.length > 0,
        has_row_header: node.metadata?.hasRowHeader || false,
        children: tableRows
      }
    };
  }

  /**
   * ✅ NOUVEAU - Conversion des callouts
   */
  private convertCallout(node: ASTNode, _options: ConversionOptions): NotionBlock {
    const icon = node.metadata?.icon || '📝';
    const color = node.metadata?.color || 'gray_background';

    // ✅ FIX: Utiliser le rich text déjà parsé
    let richText: NotionRichText[];
    if (node.metadata?.richText) {
      richText = node.metadata.richText;
    } else {
      richText = RichTextBuilder.fromMarkdown(node.content || '');
    }

    return {
      type: 'callout',
      callout: {
        rich_text: richText,
        icon: {
          type: 'emoji',
          emoji: icon
        },
        color: color
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
    const expression = (node.content || '').trim();

    // ✅ VALIDATION: Si l'expression est vide, convertir en paragraphe de texte
    if (!expression) {
      return {
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: node.content || '' }
          }],
          color: 'default'
        }
      };
    }

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

  /**
   * ✅ CORRECTION: Conversion des quotes (blockquotes simples uniquement)
   * 
   * IMPORTANT: Les blockquotes Notion ne supportent PAS les enfants structurés
   * (pas de listes, to-dos, etc.). Pour du contenu structuré, utiliser des toggles.
   */
  private convertQuote(node: ASTNode, options: ConversionOptions): NotionBlock {
    let richText: NotionRichText[];
    if (node.metadata?.richText) {
      richText = node.metadata.richText;
    } else {
      richText = RichTextBuilder.fromMarkdown(node.content || '');
    }

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
    let richText: NotionRichText[];
    if (node.metadata?.richText) {
      richText = node.metadata.richText;
    } else {
      richText = RichTextBuilder.fromMarkdown(node.content || '');
    }

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
   * ✅ NOUVEAU: Nettoie un bloc en supprimant les propriétés internes
   */
  private cleanBlock(block: NotionBlock): NotionBlock {
    const cleaned = { ...block };
    
    // Supprimer toutes les propriétés qui commencent par _
    Object.keys(cleaned).forEach(key => {
      if (key.startsWith('_')) {
        delete (cleaned as any)[key];
      }
    });
    
    return cleaned;
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
    // ✅ NOUVEAU: Permettre les propriétés internes temporaires (préfixées par _)
    const orphanProperties = Object.keys(block).filter(key => 
      !validRootProperties.includes(key) && !key.startsWith('_')
    );

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