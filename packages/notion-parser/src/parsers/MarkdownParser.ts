import { BaseParser } from './BaseParser';
import type { ASTNode, ParseOptions } from '../types';
import { htmlToMarkdownConverter } from '../converters/HtmlToMarkdownConverter';

/**
 * @deprecated Utilisez ModernParser de la nouvelle architecture
 * Conservé uniquement pour la compatibilité descendante
 */
export class MarkdownParser extends BaseParser {
  private static readonly MAX_RECURSION_DEPTH = 5;

  constructor(options: ParseOptions = {}) {
    super(options);
  }

  // Méthode publique (API existante)
  parse(content: string): ASTNode[] {
    return this.parseWithDepth(content, 0);
  }

  // Nouvelle méthode privée avec protection
  private parseWithDepth(content: string, depth: number): ASTNode[] {
    if (!content?.trim()) return [];

    // Protection contre récursivité excessive
    if (depth >= MarkdownParser.MAX_RECURSION_DEPTH) {
      console.warn(`[MarkdownParser] Max recursion depth reached (${depth}). Converting to text.`);
      return [this.createTextNode(content)];
    }

    const nodes: ASTNode[] = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        const { node, consumed } = this.parseCodeBlock(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Equation blocks
      if (trimmed === '$' || trimmed.startsWith('$$')) {
        const { node, consumed } = this.parseEquationBlock(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Quotes (" ou |) - AVANT tables pour éviter confusion
      if (this.isQuoteLine(trimmed)) {
        const node = this.parseQuote(trimmed);
        if (node) nodes.push(node);
        i++;
        continue;
      }

      // Tables
      if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('|')) {
        const { node, consumed } = this.parseTable(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Tables CSV/TSV
      if (this.looksLikeCSV(trimmed) || this.looksLikeTSV(trimmed)) {
        const { node, consumed } = this.parseCSVTable(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Toggle headings (> # Heading) - AVANT trim pour détecter correctement
      // ✅ CORRECTION: Regex plus permissive pour capturer tous les cas
      // Changement: #{1,3}\s+ → #{1,3}(\s+|$)
      // Raison: Accepter les headings sans texte immédiatement après le #
      if (line.match(/^>\s*#{1,3}(\s+|$)/)) {

        const { node, consumed } = this.parseToggleHeading(lines, i, depth);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Multi-line callouts
      if (trimmed.match(/^>\s*\[!(\w+)\]/)) {
        const { node, consumed } = this.parseCallout(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Toggles (> content without heading or callout)
      if (this.isToggleLine(trimmed) && !line.match(/^>\s*\[!/) && !line.match(/^>\s*#{1,3}(\s+|$)/)) {

        const { node, consumed } = this.parseToggle(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Nested lists (up to 3 levels)
      if (this.isListLine(trimmed)) {
        const { nodes: listNodes, consumed } = this.parseNestedList(lines, i);
        nodes.push(...listNodes);
        i += consumed;
        continue;
      }

      // Multi-line paragraphs pour fusionner les lignes consécutives
      if (this.isParagraphStart(trimmed)) {
        const { node, consumed } = this.parseMultiLineParagraph(lines, i);
        if (node) nodes.push(node);
        i += consumed;
        continue;
      }

      // Single line parsing (seulement si ce n'est pas un paragraphe multi-ligne)
      const node = this.parseLine(trimmed);
      if (node) nodes.push(node);

      i++;
    }

    // Ne plus limiter arbitrairement - laisser le chunking gérer les gros documents
    return nodes;
  }

  private parseLine(line: string): ASTNode | null {
    // Headers
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length as 1 | 2 | 3;
      return this.createHeadingNode(headerMatch[2], level);
    }

    // Images with inline content
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)(.*)$/);
    if (imageMatch) {
      const caption = imageMatch[1];
      const url = imageMatch[2];
      const afterText = imageMatch[3].trim();

      // Si texte après l'image, créer un paragraphe avec l'image en markdown + le texte
      if (afterText) {
        // (sera parsé correctement par NotionConverter)
        return this.createTextNode(`![${caption}](${url}) ${afterText}`);
      }

      // Image seule
      return this.createMediaNode('image', url, caption);
    }

    // Lists (will be handled by parseNestedList for proper nesting)
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bulletMatch) {
      // Parse le contenu pour préserver le formatage inline
      const content = bulletMatch[2];
      return this.createListItemNode(content, 'bulleted');
    }

    const numberedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (numberedMatch) {
      // Parse le contenu pour préserver le formatage inline
      const content = numberedMatch[2];
      return this.createListItemNode(content, 'numbered');
    }

    // Checkboxes
    const checkboxMatch = line.match(/^(\s*)- \[([ x])\]\s+(.+)$/);
    if (checkboxMatch) {
      // Parse le contenu pour préserver le formatage inline
      const content = checkboxMatch[3];
      return this.createListItemNode(content, 'todo', checkboxMatch[2] === 'x');
    }

    // Quotes are handled in the main parse() method, not here

    // Dividers (3+ caractères, standard Markdown)
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      return this.createDividerNode();
    }

    // URLs - Check for audio first, then other media, then bookmark
    if (this.isValidUrl(line)) {
      // Check if it's an audio URL
      if (this.isAudioUrl(line)) {
        return this.createMediaNode('audio', line);
      }

      // Check if it's a video URL
      if (this.isVideoUrl(line)) {
        return this.createMediaNode('video', line);
      }

      // Check if it's an image URL
      if (this.isImageUrl(line)) {
        return this.createMediaNode('image', line);
      }

      // Default to bookmark
      return this.createBookmarkNode(line);
    }

    // HTML inline handling
    if (line.includes('<') && line.includes('>')) {
      return this.parseHtmlInline(line);
    }

    // Regular paragraph
    return this.createTextNode(line);
  }

  private static readonly MAX_CODE_BLOCK_LINES = 1000;

  private parseCodeBlock(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];

    // Parser le language correctement
    const langMatch = firstLine.match(/^```([a-zA-Z0-9#+\-._]*)/);
    const language = langMatch && langMatch[1] ?
      langMatch[1].split(/[\s{]/)[0].toLowerCase() :
      'plain text';

    const codeLines: string[] = [];
    let i = startIdx + 1;

    // Limiter le nombre de lignes pour éviter out of memory
    while (i < lines.length &&
      !lines[i].trim().startsWith('```') &&
      (i - startIdx) < MarkdownParser.MAX_CODE_BLOCK_LINES) {
      codeLines.push(lines[i]);
      i++;
    }

    // Gérer fermeture manquante proprement
    if (i >= lines.length || (i - startIdx) >= MarkdownParser.MAX_CODE_BLOCK_LINES) {
      const code = codeLines.join('\n');
      const truncatedCode = this.truncateContent(code, this.options.maxCodeLength || 2000);

      console.warn(`[MarkdownParser] Code block at line ${startIdx + 1} has no closing backticks or exceeds max lines`);

      // Consommer tout le bloc, pas juste 1 ligne
      return {
        node: this.createCodeNode(truncatedCode, language, true),
        consumed: i - startIdx  // Pas de +1 car pas de ligne de fermeture
      };
    }

    // Fermeture trouvée normalement
    const code = codeLines.join('\n');
    const truncatedCode = this.truncateContent(code, this.options.maxCodeLength || 2000);

    return {
      node: this.createCodeNode(truncatedCode, language, true),
      consumed: i - startIdx + 1  // +1 pour inclure la ligne de fermeture
    };
  }

  private parseEquationBlock(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];

    // Handle $$equation$$ single line
    if (firstLine.startsWith('$$') && firstLine.endsWith('$$') && firstLine.length > 4) {
      const expression = firstLine.slice(2, -2).trim();
      return {
        node: this.createEquationNode(expression, true),
        consumed: 1
      };
    }

    // Handle multi-line $ or $$
    const equationLines: string[] = [];
    let i = startIdx + 1;
    const delimiter = firstLine.startsWith('$$') ? '$$' : '$';

    while (i < lines.length && lines[i].trim() !== delimiter) {
      equationLines.push(lines[i]);
      i++;
    }

    if (i >= lines.length) {
      // No closing delimiter, treat as text
      return { node: this.createTextNode(firstLine), consumed: 1 };
    }

    const expression = equationLines.join('\n').trim();

    if (!expression) {
      return { node: null, consumed: i - startIdx + 1 };
    }

    return {
      node: this.createEquationNode(expression, true),
      consumed: i - startIdx + 1
    };
  }

  private parseTable(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const tableLines: string[] = [];
    let i = startIdx;

    // Collect all table lines
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      tableLines.push(lines[i]);
      i++;
    }

    if (tableLines.length < 2) {
      return { node: null, consumed: 1 };
    }

    // Parse headers
    const headers = this.parseTableRow(tableLines[0]);

    // Check for separator line
    let dataStartIndex = 1;
    if (tableLines.length > 1 && this.isTableSeparator(tableLines[1])) {
      dataStartIndex = 2;
    }

    // Parse data rows
    const rows = tableLines.slice(dataStartIndex).map(line => this.parseTableRow(line));

    // Normalize row lengths
    const maxColumns = Math.max(headers.length, ...rows.map(row => row.length));
    const normalizedHeaders = this.normalizeTableRow(headers, maxColumns);
    const normalizedRows = rows.map(row => this.normalizeTableRow(row, maxColumns));

    // Detect headers
    const hasColumnHeader = this.detectColumnHeader(normalizedHeaders, normalizedRows, dataStartIndex > 1);
    const hasRowHeader = this.detectRowHeader(normalizedHeaders, normalizedRows);

    return {
      node: this.createTableNode(normalizedHeaders, normalizedRows, {
        hasColumnHeader,
        hasRowHeader
      }),
      consumed: i - startIdx
    };
  }

  private parseTableRow(line: string): string[] {
    // Remove leading/trailing pipes and split
    const trimmed = line.trim();
    const withoutOuterPipes = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
    const withoutTrailingPipe = withoutOuterPipes.endsWith('|')
      ? withoutOuterPipes.slice(0, -1)
      : withoutOuterPipes;

    return withoutTrailingPipe
      .split('|')
      .map(cell => cell.trim());
  }

  private isTableSeparator(line: string): boolean {
    const trimmed = line.trim();
    return /^[\|\-:\s]+$/.test(trimmed) && trimmed.includes('-');
  }

  private detectColumnHeader(headers: string[], rows: string[][], hasSeparator: boolean): boolean {
    // If there's a separator line (|---|---|), it's definitely a header
    if (hasSeparator) {
      return true;
    }

    // If no data rows, can't determine
    if (rows.length === 0) {
      return false;
    }

    // Heuristic: If first row has capitalized words, it's likely a header
    const capitalizedCount = headers.filter(cell => {
      const trimmed = cell.trim();
      return trimmed.length > 0 && /^[A-Z]/.test(trimmed);
    }).length;

    // If more than half the cells are capitalized, consider it a header
    return capitalizedCount > headers.length / 2;
  }

  private detectRowHeader(headers: string[], rows: string[][]): boolean {
    if (rows.length < 2) return false;

    // Get first column (including header)
    const firstColumn = [headers[0], ...rows.map(row => row[0] || '')];

    // Heuristic 1: If first column contains mostly text (not numbers), it might be row headers
    const textCount = firstColumn.filter(cell => {
      const trimmed = cell.trim();
      return trimmed.length > 0 && isNaN(Number(trimmed));
    }).length;

    // Heuristic 2: Check if first column looks like labels/categories vs data
    const looksLikeLabels = firstColumn.filter(cell => {
      const trimmed = cell.trim().toLowerCase();
      // Exclude email-like patterns, URLs, and other data patterns
      if (trimmed.includes('@') || trimmed.includes('.com') || trimmed.includes('http')) {
        return false;
      }
      // Look for typical label patterns (single words, short phrases)
      return trimmed.length > 0 && trimmed.length < 20 && !trimmed.includes(' ');
    }).length;

    // If more than 80% of first column looks like labels AND mostly text, consider it row headers
    return textCount > firstColumn.length * 0.8 && looksLikeLabels > firstColumn.length * 0.6;
  }

  private normalizeTableRow(row: string[], targetLength: number): string[] {
    const normalized = [...row];

    // Pad with empty strings if too short
    while (normalized.length < targetLength) {
      normalized.push('');
    }

    // Truncate if too long
    if (normalized.length > targetLength) {
      normalized.length = targetLength;
    }

    return normalized;
  }

  /**
   * ✅ SOLUTION OPTIMISÉE ET ROBUSTE: Parse un toggle heading avec support complet des enfants imbriqués
   * 
   * Syntaxe:
   * > # Heading
   * > Contenu ligne 1
   * > Contenu ligne 2
   * >
   * > Même après ligne vide
   */
  private parseToggleHeading(lines: string[], startIdx: number, depth: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];
    const match = firstLine.match(/^>\s*(#{1,3})(\s+(.+))?$/);

    if (!match) {
      console.debug('[parseToggleHeading] No match for line:', firstLine);
      return { node: null, consumed: 1 };
    }

    const level = match[1].length as 1 | 2 | 3;
    const title = (match[3] || '').trim();

    console.debug('[parseToggleHeading] Parsing heading:', { level, title });

    // ✅ Collecter TOUTES les lignes enfants consécutives commençant par >
    const childLines: string[] = [];
    let i = startIdx + 1;
    let consecutiveEmptyLines = 0;
    const MAX_EMPTY_LINES = 2; // Autoriser max 2 lignes vides consécutives

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // ✅ Ligne commençant par >
      if (trimmed.startsWith('>')) {
        const content = trimmed.replace(/^>\s*/, '');

        // ✅ Détecter si c'est un NOUVEAU toggle heading ou callout (arrêter)
        if (content.match(/^#{1,3}\s+/) || content.match(/^\[!(\w+)\]/)) {
          console.debug('[parseToggleHeading] Found new structure, stopping');
          break;
        }

        // ✅ Ajouter le contenu (même vide pour préserver structure)
        childLines.push(content);
        consecutiveEmptyLines = content.trim() ? 0 : consecutiveEmptyLines + 1;

        // ✅ Arrêter si trop de lignes vides consécutives
        if (consecutiveEmptyLines > MAX_EMPTY_LINES) {
          console.debug('[parseToggleHeading] Too many empty lines, stopping');
          break;
        }

        i++;
      }
      // ✅ Ligne vide (peut faire partie du contenu)
      else if (!trimmed) {
        consecutiveEmptyLines++;
        if (consecutiveEmptyLines > MAX_EMPTY_LINES) {
          console.debug('[parseToggleHeading] Too many empty lines, stopping');
          break;
        }
        childLines.push('');
        i++;
      }
      // ✅ Ligne sans > = fin du toggle heading
      else {
        console.debug('[parseToggleHeading] Line without >, stopping');
        break;
      }
    }

    // ✅ Nettoyer les lignes vides en fin
    while (childLines.length > 0 && !childLines[childLines.length - 1].trim()) {
      childLines.pop();
    }

    console.debug('[parseToggleHeading] Child lines collected:', childLines.length);

    // ✅ Parser récursivement les enfants avec TOUTES les fonctionnalités
    const children: ASTNode[] = [];
    if (childLines.length > 0) {
      const childContent = childLines.join('\n');
      const parsedChildren = this.parseWithDepth(childContent, depth + 1);
      children.push(...parsedChildren);
      console.debug('[parseToggleHeading] Parsed children:', children.length);
    }

    const node = this.createToggleHeadingNode(title, level, children);
    console.debug('[parseToggleHeading] Created node:', {
      type: node.type,
      isToggleable: node.metadata?.isToggleable,
      hasChildren: node.metadata?.hasChildren,
      childrenCount: children.length
    });

    return {
      node,
      consumed: i - startIdx
    };
  }

  private parseBlockquote(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];
    const content = firstLine.substring(2).trim(); // Remove "> "

    if (!content) return { node: null, consumed: 1 };

    // For single line quotes, just create a simple quote
    return {
      node: this.createQuoteNode(content),
      consumed: 1
    };
  }

  private parseNestedBlockquotes(lines: string[], startIdx: number): { nodes: ASTNode[]; consumed: number } {
    const quoteItems: Array<{ content: string; level: number }> = [];
    let i = startIdx;

    // Collect all consecutive blockquote lines with their levels
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Stop if not a blockquote line or empty line
      if (!trimmed.startsWith('>')) {
        break;
      }

      // Count the level of nesting (number of > symbols)
      const level = this.getBlockquoteLevel(trimmed);
      const content = this.extractToggleContent(trimmed);

      if (content) {
        quoteItems.push({ content, level });
      }

      i++;
    }

    if (quoteItems.length === 0) {
      return { nodes: [], consumed: 0 };
    }

    // Group by level and create separate quotes
    const groupedByLevel = new Map<number, string[]>();

    quoteItems.forEach(item => {
      if (!groupedByLevel.has(item.level)) {
        groupedByLevel.set(item.level, []);
      }
      groupedByLevel.get(item.level)!.push(item.content);
    });

    // Create quotes for each level
    const nodes: ASTNode[] = [];

    // Sort levels to process in order
    const sortedLevels = Array.from(groupedByLevel.keys()).sort((a, b) => a - b);

    sortedLevels.forEach(level => {
      const contents = groupedByLevel.get(level)!;
      const combinedContent = contents.join(' ');
      nodes.push(this.createQuoteNode(combinedContent));
    });

    return {
      nodes,
      consumed: i - startIdx
    };
  }

  private getBlockquoteLevel(line: string): number {
    let level = 0;
    let pos = 0;

    // Skip leading whitespace
    while (pos < line.length && line[pos] === ' ') {
      pos++;
    }

    // Count > symbols
    while (pos < line.length && line[pos] === '>') {
      level++;
      pos++;
      // Skip optional space after >
      if (pos < line.length && line[pos] === ' ') {
        pos++;
      }
    }

    return level;
  }



  /**
   * ✅ NOUVEAU: Parse une quote simple (" ou |)
   */
  private parseQuote(line: string): ASTNode | null {
    const content = this.extractQuoteContent(line);
    if (!content) return null;
    
    return this.createQuoteNode(content);
  }

  /**
   * ✅ NOUVEAU: Parse un toggle (>) avec enfants possibles
   */
  private parseToggle(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const toggleLines: string[] = [];
    let i = startIdx;

    // Collecter toutes les lignes consécutives qui commencent par >
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!this.isToggleLine(trimmed)) {
        break;
      }

      const content = this.extractToggleContent(trimmed);

      // Vérifier si c'est un callout ou toggle heading (déjà traité ailleurs)
      if (content.match(/^\[!(\w+)\]/) || content.match(/^#{1,3}\s+/)) {
        break;
      }

      if (content) {
        toggleLines.push(content);
      } else {
        // Ligne vide dans le toggle
        toggleLines.push('');
      }

      i++;
    }

    if (toggleLines.length === 0) {
      return { node: null, consumed: 1 };
    }

    // Créer un toggle avec enfants
    return {
      node: this.createToggleFromLines(toggleLines),
      consumed: i - startIdx
    };
  }

  private collectBlockquoteLines(lines: string[], startIdx: number): string[] {
    const contentLines: string[] = [];
    let i = startIdx;

    // Collect all consecutive lines starting with >
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed.startsWith('>')) {
        break;
      }

      // 🔧 CORRECTION: Gérer tous les niveaux de > correctement
      const content = this.extractToggleContent(trimmed);
      if (content) {
        contentLines.push(content);
      }

      i++;
    }

    return contentLines;
  }

  private isSimpleQuote(lines: string[]): boolean {
    // Vérifie si les lignes contiennent SEULEMENT du texte
    // (pas de #, -, *, 1., etc.)
    return lines.every(line =>
      !line.match(/^#{1,6}\s/) &&  // Pas de heading
      !line.match(/^[-*+]\s/) &&    // Pas de liste
      !line.match(/^\d+\.\s/)       // Pas de liste numérotée
    );
  }

  private hasComplexContent(lines: string[]): boolean {
    // Vérifie si le contenu contient des éléments complexes
    return lines.some(line =>
      line.match(/^#{1,6}\s/) ||    // Heading
      line.match(/^[-*+]\s/) ||     // Liste
      line.match(/^\d+\.\s/) ||     // Liste numérotée
      line.match(/^\|.*\|/) ||      // Table
      line.match(/^```/)            // Code block
    );
  }

  private parseToggleBlock(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    // Cette méthode est maintenant remplacée par parseToggle
    // Gardée pour compatibilité mais ne devrait plus être appelée
    return this.parseToggle(lines, startIdx);
  }

  private parseCallout(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const firstLine = lines[startIdx];
    const match = firstLine.match(/^>\s*\[!(\w+)\]\s*(.*)$/);

    if (!match) return { node: null, consumed: 1 };

    const iconName = match[1].toLowerCase();
    const firstContent = match[2] || '';

    const contentLines = firstContent ? [firstContent] : [];
    let i = startIdx + 1;
    let consecutiveEmptyLines = 0;
    const MAX_CONSECUTIVE_EMPTY = 2;

    // Parse multi-line callout content
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('>')) {
        // Check if this is a new callout
        if (trimmed.match(/^>\s*\[!(\w+)\]/)) {
          break;
        }

        // Extract content after > (preserve spaces)
        const content = line.replace(/^>\s?/, '');

        if (content.trim()) {
          consecutiveEmptyLines = 0;
        } else {
          consecutiveEmptyLines++;
        }

        contentLines.push(content);
        i++;
      } else if (!trimmed) {
        consecutiveEmptyLines++;

        // Stop if too many consecutive empty lines
        if (consecutiveEmptyLines >= MAX_CONSECUTIVE_EMPTY) {
          break;
        }

        // Consider empty line as part of callout
        contentLines.push('');
        i++;
      } else {
        // Non-empty line without > : end of callout
        break;
      }
    }

    // Préserver les lignes vides dans le contenu
    const content = contentLines.join('\n').trim(); // Trim seulement les bords

    const icon = this.getCalloutIcon(iconName);
    const color = this.getCalloutColor(iconName);

    return {
      node: this.createCalloutNode(content, icon, color),
      consumed: i - startIdx
    };
  }

  private isListLine(line: string): boolean {
    return /^(\s*)[-*+]\s+/.test(line) ||
      /^(\s*)\d+\.\s+/.test(line) ||
      /^(\s*)- \[([ x])\]\s+/.test(line);
  }

  private parseNestedList(lines: string[], startIdx: number): { nodes: ASTNode[]; consumed: number } {
    const listItems: Array<{ node: ASTNode; level: number; type: string }> = [];
    let i = startIdx;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!this.isListLine(trimmed)) {
        break;
      }

      const level = this.getIndentationLevel(line);
      const listItem = this.parseListItem(trimmed);

      if (listItem) {
        listItems.push({
          node: listItem.node,
          level,
          type: listItem.type
        });
      }

      i++;
    }

    // Convert flat list to nested structure
    const nestedNodes = this.buildNestedListStructure(listItems);

    return {
      nodes: nestedNodes,
      consumed: i - startIdx
    };
  }

  private getIndentationLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    if (!match) return 0;

    const indent = match[1];

    // Gérer les tabs (1 tab = 1 niveau)
    if (indent.includes('\t')) {
      let level = 0;
      let pos = 0;

      for (const char of indent) {
        if (char === '\t') {
          level++;
        } else {
          // Espaces après tabs (ignorer ou compter comme partial)
          pos++;
        }
      }

      // Ajouter les espaces résiduels si significatifs
      if (pos >= 2) {
        level += Math.floor(pos / 2);
      }

      return level;
    }

    // Détection automatique: 2 ou 4 espaces
    // Heuristique: si >= 4 espaces, probablement 4-space indent
    if (indent.length >= 4 && indent.length % 4 === 0) {
      return indent.length / 4;
    }

    // Par défaut: 2 espaces = 1 niveau
    return Math.floor(indent.length / 2);
  }

  private parseListItem(line: string): { node: ASTNode; type: string } | null {
    // Checkbox
    const checkboxMatch = line.match(/^(\s*)- \[([ x])\]\s+(.+)$/);
    if (checkboxMatch) {
      return {
        node: this.createListItemNode(checkboxMatch[3], 'todo', checkboxMatch[2] === 'x'),
        type: 'todo'
      };
    }

    // Bulleted list
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bulletMatch) {
      return {
        node: this.createListItemNode(bulletMatch[2], 'bulleted'),
        type: 'bulleted'
      };
    }

    // Numbered list
    const numberedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (numberedMatch) {
      return {
        node: this.createListItemNode(numberedMatch[2], 'numbered'),
        type: 'numbered'
      };
    }

    return null;
  }

  private buildNestedListStructure(items: Array<{ node: ASTNode; level: number; type: string }>): ASTNode[] {
    if (items.length === 0) return [];

    const result: ASTNode[] = [];
    const stack: Array<{ node: ASTNode; level: number; children: ASTNode[] }> = [];

    for (const item of items) {
      // Pop items from stack that are at HIGHER level only (not same level)
      while (stack.length > 0 && stack[stack.length - 1].level > item.level) {
        const popped = stack.pop()!;
        if (popped.children.length > 0) {
          (popped.node as any).children = popped.children;
        }

        if (stack.length > 0) {
          stack[stack.length - 1].children.push(popped.node);
        } else {
          result.push(popped.node);
        }
      }

      // Add current item to stack
      stack.push({
        node: item.node,
        level: item.level,
        children: []
      });
    }

    // Pop remaining items from stack
    while (stack.length > 0) {
      const popped = stack.pop()!;
      if (popped.children.length > 0) {
        (popped.node as any).children = popped.children;
      }

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(popped.node);
      } else {
        result.push(popped.node);
      }
    }

    return result;
  }

  private isParagraphStart(line: string): boolean {
    // Not a special markdown element
    const isSpecialMarkdown = line.match(/^(#{1,3}\s|[-*+]\s|\d+\.\s|>\s|\|.*\||```|---|\*\*\*|___|!\[)/);

    // ✅ CORRECTION: Les URLs doivent être traitées individuellement, pas comme paragraphes
    const isUrl = this.isValidUrl(line.trim());

    return !isSpecialMarkdown && !isUrl;
  }

  private parseMultiLineParagraph(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const paragraphLines: string[] = [];
    let i = startIdx;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty line ends paragraph
      if (!trimmed) {
        break;
      }

      // Special markdown elements end paragraph
      if (this.isSpecialMarkdownLine(trimmed)) {
        break;
      }

      paragraphLines.push(line);
      i++;
    }

    if (paragraphLines.length === 0) {
      return { node: null, consumed: 1 };
    }

    // Join lines with soft breaks (spaces)
    const content = paragraphLines.join(' ');

    // ✅ CORRECTION: Appliquer la conversion HTML si nécessaire
    const finalContent = content.includes('<') && content.includes('>')
      ? this.convertHtmlToMarkdown(content)
      : content;

    return {
      node: this.createTextNode(finalContent),
      consumed: i - startIdx
    };
  }

  private isSpecialMarkdownLine(line: string): boolean {
    return /^(#{1,3}\s|[-*+]\s|\d+\.\s|>\s|\|.*\||```|---|\*\*\*|___|!\[)/.test(line);
  }

  private parseHtmlInline(line: string): ASTNode {
    // ✅ NOUVEAU: Convertir HTML → Markdown puis parser normalement
    const convertedMarkdown = this.convertHtmlToMarkdown(line);

    // Créer un nœud texte avec le markdown converti
    // Le formatage sera appliqué par le RichTextConverter lors de la conversion finale
    return this.createTextNode(convertedMarkdown);
  }

  private convertHtmlToMarkdown(html: string): string {
    // ✅ CORRECTION: Utiliser le nouveau convertisseur HTML robuste
    return htmlToMarkdownConverter.convert(html);
  }

  private getCalloutIcon(name: string): string {
    const icons: Record<string, string> = {
      'note': '📝',
      'info': 'ℹ️',
      'tip': '💡',
      'warning': '⚠️',
      'danger': '🚨',
      'success': '✅',
      'question': '❓',
      'quote': '💬',
      'example': '📌',
      'bug': '🐛',
      'todo': '☑️',
      'abstract': '📄',
      'summary': '📋',
      'tldr': '📋',
      'failure': '❌',
      'fail': '❌',
      'missing': '❓',
      'check': '✅',
      'done': '✅'
    };
    return icons[name] || '💡';
  }

  private getCalloutColor(name: string): string {
    const colors: Record<string, string> = {
      'note': 'blue_background',
      'info': 'blue_background',
      'tip': 'green_background',
      'warning': 'yellow_background',
      'danger': 'red_background',
      'success': 'green_background',
      'question': 'purple_background',
      'quote': 'gray_background',
      'example': 'blue_background',
      'bug': 'red_background',
      'todo': 'blue_background',
      'abstract': 'purple_background',
      'summary': 'purple_background',
      'tldr': 'purple_background',
      'failure': 'red_background',
      'fail': 'red_background',
      'missing': 'yellow_background',
      'check': 'green_background',
      'done': 'green_background'
    };
    return colors[name] || 'gray_background';
  }



  private looksLikeCSV(line: string): boolean {
    // Au moins 2 virgules et pas de pipes
    return !line.includes('|') && (line.match(/,/g) || []).length >= 2;
  }

  private looksLikeTSV(line: string): boolean {
    // Au moins 2 tabs et pas de pipes
    return !line.includes('|') && (line.match(/\t/g) || []).length >= 2;
  }

  private parseCSVTable(lines: string[], startIdx: number): { node: ASTNode | null; consumed: number } {
    const tableLines: string[] = [];
    let i = startIdx;
    const delimiter = lines[i].includes('\t') ? '\t' : ',';

    // Collecter lignes qui ressemblent au même format
    while (i < lines.length) {
      const line = lines[i];
      const delimiterCount = (line.match(new RegExp(delimiter === '\t' ? '\t' : ',', 'g')) || []).length;

      if (delimiterCount >= 1) {
        tableLines.push(line);
        i++;
      } else if (!line.trim()) {
        // Ligne vide = fin de table
        break;
      } else {
        break;
      }
    }

    if (tableLines.length < 2) {
      return { node: null, consumed: 1 };
    }

    // Parser CSV/TSV
    const rows = tableLines.map(line => {
      // Simple split (pourrait utiliser une lib CSV pour plus de robustesse)
      return line.split(delimiter).map(cell => cell.trim());
    });

    // Première ligne = headers si pas numérique
    const firstRow = rows[0];
    const hasHeaders = !firstRow.every(cell => /^\d+(\.\d+)?$/.test(cell));

    if (hasHeaders) {
      const headers = rows[0];
      const dataRows = rows.slice(1);

      return {
        node: this.createTableNode(headers, dataRows, {
          hasColumnHeader: true,
          hasRowHeader: false
        }),
        consumed: i - startIdx
      };
    } else {
      // Pas de headers
      return {
        node: this.createTableNode([], rows, {
          hasColumnHeader: false,
          hasRowHeader: false
        }),
        consumed: i - startIdx
      };
    }
  }

  /**
   * ✅ SOLUTION OPTIMISÉE: Décide si un blockquote doit être un Toggle ou une Quote
   * 
   * Règles claires:
   * - Toggle: Contenu structuré (listes, headings, tables) OU 4+ lignes
   * - Quote: Texte simple, 1-3 lignes
   */
  private shouldBeToggle(lines: string[]): boolean {
    // ✅ LOGIQUE CORRIGÉE: Contenu structuré = Toggle (car quotes ne supportent pas les enfants)
    const hasStructure = lines.some(line => {
      const trimmed = line.trim();
      return (
        trimmed.match(/^#{1,6}\s/) ||      // Heading
        trimmed.match(/^[-*+]\s/) ||       // Liste à puces
        trimmed.match(/^\d+\.\s/) ||       // Liste numérotée
        trimmed.match(/^- \[([ x])\]\s/) || // Checkbox/to-do
        trimmed.match(/^\|.*\|/) ||        // Table
        trimmed.match(/^```/) ||           // Code block
        trimmed.match(/^>\s/) ||           // Citation imbriquée
        trimmed.match(/^!\[/)              // Image
      );
    });

    if (hasStructure) return true;

    // Règle 2: Contenu long (4+ lignes) = toggle pour meilleure UX
    if (lines.filter(l => l.trim()).length >= 4) return true;

    // Règle 3: Contenu court sans structure = quote simple
    return false;
  }

  /**
   * ✅ HELPER: Détecte si une ligne est une quote (" ou |)
   */
  private isQuoteLine(line: string): boolean {
    const trimmed = line.trim();
    // Quote avec guillemets : doit commencer et finir par "
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
      return true;
    }
    // Quote avec pipe : doit commencer par | suivi d'un espace
    if (trimmed.startsWith('| ') && !trimmed.includes('|', 2)) {
      return true;
    }
    return false;
  }

  /**
   * ✅ HELPER: Extrait le contenu d'une quote (" ou |)
   */
  private extractQuoteContent(line: string): string {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      // Retirer les guillemets
      return trimmed.slice(1, -1);
    } else if (trimmed.startsWith('| ')) {
      // Retirer le | et l'espace
      return trimmed.substring(2);
    }
    
    return trimmed;
  }

  /**
   * ✅ HELPER: Détecte si une ligne est un toggle (>)
   */
  private isToggleLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('>');
  }

  /**
   * ✅ HELPER: Extrait le contenu d'un toggle (>)
   */
  private extractToggleContent(line: string): string {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('>')) {
      // Retirer tous les > consécutifs au début
      let content = trimmed;
      while (content.startsWith('>')) {
        content = content.substring(1).trim();
      }
      return content;
    }
    
    return trimmed;
  }

  /**
   * ✅ SOLUTION OPTIMISÉE: Crée un toggle avec parsing récursif complet des enfants
   */
  private createToggleFromLines(lines: string[]): ASTNode {
    if (lines.length === 0) {
      return {
        type: 'toggle',
        content: 'Toggle',
        children: [],
        metadata: { hasChildren: false }
      };
    }

    // La première ligne = titre du toggle
    const title = lines[0].trim();

    // Le reste = contenu enfant (parsing récursif COMPLET)
    const childLines = lines.slice(1);
    const children: ASTNode[] = [];

    if (childLines.length > 0) {
      // ✅ Parser RÉCURSIVEMENT avec TOUS les features (listes, code, tables, etc.)
      const childContent = childLines.join('\n');
      const parsedChildren = this.parseWithDepth(childContent, 1); // Protection récursivité
      children.push(...parsedChildren);
    }

    return {
      type: 'toggle',
      content: title,
      children: children.length > 0 ? children : undefined,
      metadata: {
        color: 'default',
        hasChildren: children.length > 0
      }
    };
  }

  /**
   * ✅ Parser simplifié pour contenu enfant
   */
  private parseSimpleContent(content: string): ASTNode[] {
    const lines = content.split('\n');
    const nodes: ASTNode[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Parser seulement les éléments de base
      const node = this.parseLine(trimmed);
      if (node) nodes.push(node);
    }

    return nodes;
  }

  /**
   * ✅ OVERRIDE: Factory pour toggle heading avec type correct
   */
  protected createToggleHeadingNode(content: string, level: 1 | 2 | 3, children: ASTNode[] = []): ASTNode {
    return {
      type: `heading_${level}` as 'heading_1' | 'heading_2' | 'heading_3',
      content,
      children,
      metadata: {
        level,
        isToggleable: true,  // ✅ Propriété clé pour Notion API
        hasChildren: children.length > 0
      }
    };
  }

  /**
   * ✅ OVERRIDE: Factory pour toggle node
   */
  protected createToggleNode(content: string, children: ASTNode[] = []): ASTNode {
    return {
      type: 'toggle',
      content,
      children,
      metadata: {
        color: 'default',
        hasChildren: children.length > 0
      }
    };
  }

  /**
   * ✅ OVERRIDE: Détection des URLs audio
   */
  protected isAudioUrl(url: string): boolean {
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
    const lowerUrl = url.toLowerCase();
    return audioExtensions.some(ext => lowerUrl.endsWith(ext));
  }

  /**
   * ✅ NOUVEAU: Détection des URLs PDF
   */
  private isPdfUrl(url: string): boolean {
    return url.toLowerCase().endsWith('.pdf');
  }

  /**
   * Enhanced list parsing with better nesting support
   */
  static parseMarkdownList(content: string): ASTNode[] {
    const parser = new MarkdownParser();
    const lines = content.split('\n');
    const { nodes } = parser.parseNestedList(lines, 0);
    return nodes;
  }

  /**
   * Parse markdown tables with advanced features
   */
  static parseMarkdownTable(content: string): ASTNode | null {
    const parser = new MarkdownParser();
    const lines = content.split('\n');
    const { node } = parser.parseTable(lines, 0);
    return node;
  }
}