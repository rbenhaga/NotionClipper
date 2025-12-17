/**
 * NotionClipboardEditor V3 - Éditeur Notion complet et amélioré
 *
 * Fonctionnalités:
 * - Synchronisation intelligente avec le clipboard (actualisation automatique)
 * - Protection du contenu édité par l'utilisateur
 * - Bouton pour annuler les modifications et revenir au clipboard
 * - Images intégrées inline comme sur Notion
 * - Fichiers intégrés inline (pas de carrousel séparé)
 * - MathJax pour équations LaTeX
 * - Menu de formatage contextuel enrichi (sélection + clic droit)
 * - Changement de type de bloc (P→H1, etc.)
 * - Support complet HTML paste avec conversion HTML→Markdown
 * - Drag & drop de fichiers/images
 * - Design fidèle à Notion
 */

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { parseContent, type NotionBlock } from '@notion-clipper/notion-parser';
import { FormattingMenu, type FormattingAction } from './FormattingMenu';
import { LiveMarkdownFormatter } from './LiveMarkdownFormatter';
import { LineStartHandler, type BlockType } from './LineStartHandler';
import { SlashMenu, type SlashCommand } from './SlashMenu';
import { DragHandle, dragHandleStyles, type BlockType as DragBlockType } from './DragHandle';
import { 
  RotateCcw, 
  Upload, 
  X, 
  Image as ImageIcon, 
  File, 
  Maximize2, 
  Minimize2,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  FileAudio,
  FileVideo,
  FileImage,
  Presentation,
  type LucideIcon
} from 'lucide-react';

// Types pour les fichiers attachés
export interface AttachedFile {
  id: string;
  file?: File;
  url?: string;
  name: string;
  type: string;
  size?: number;
  preview?: string;
}

// Types pour les images du clipboard
export interface ClipboardImage {
  id?: string;
  data?: string;
  preview?: string;
  content?: string | Uint8Array;
  url?: string;
  path?: string;
  size?: number;
  dimensions?: { width: number; height: number };
}

export interface NotionClipboardEditorProps {
  content: string;
  onChange: (content: string) => void;
  onBlocksChange?: (blocks: NotionBlock[]) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  // Nouvelles props pour la synchronisation clipboard
  clipboardContent?: string;
  hasUserEdited?: boolean;
  onResetToClipboard?: () => void;
  // Props pour les images
  images?: ClipboardImage[];
  onImageRemove?: (index: number) => void;
  // Props pour les fichiers attachés (inline)
  attachedFiles?: AttachedFile[];
  onFileRemove?: (id: string) => void;
  onFilesAdd?: (files: AttachedFile[]) => void;
  // Props pour les quotas
  fileQuotaRemaining?: number | null;
  maxFileSize?: number;
  onFileQuotaExceeded?: () => void;
  // Notification
  showNotification?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  // Live Markdown formatting (Requirements: 16.1-16.5)
  enableLiveMarkdown?: boolean;
  // Slash commands menu (Requirements: 18.1-18.6)
  enableSlashCommands?: boolean;
}

export interface NotionClipboardEditorRef {
  insertAtCursor: (text: string) => void;
  insertFileAtCursor: (file: AttachedFile) => void;
  insertImageAtCursor: (image: ClipboardImage) => void;
  focus: () => void;
  getSelection: () => Selection | null;
  getContent: () => string;
}

export const NotionClipboardEditor = forwardRef<NotionClipboardEditorRef, NotionClipboardEditorProps>((props, ref) => {
  const {
    content,
    onChange,
    onBlocksChange,
    placeholder = "Commencez à écrire, ou appuyez sur '/' pour les commandes...",
    readOnly = false,
    className = '',
    clipboardContent,
    hasUserEdited = false,
    onResetToClipboard,
    images = [],
    onImageRemove,
    attachedFiles = [],
    onFileRemove,
    onFilesAdd,
    fileQuotaRemaining,
    maxFileSize = 20 * 1024 * 1024,
    onFileQuotaExceeded,
    showNotification,
    enableLiveMarkdown = true,  // Default to true (Requirements: 16.1-16.5)
    enableSlashCommands = true  // Default to true (Requirements: 18.1-18.6)
  } = props;

  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastContentRef = useRef<string>('');
  const isInternalChangeRef = useRef(false);
  const [showFormattingMenu, setShowFormattingMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());
  
  // Drag handle state - Requirements: 22.1-22.8
  const [hoveredBlock, setHoveredBlock] = useState<HTMLElement | null>(null);
  const [dragHandlePosition, setDragHandlePosition] = useState({ top: 0, left: 0 });
  const [showDragHandle, setShowDragHandle] = useState(false);
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<{ element: HTMLElement; position: 'before' | 'after' } | null>(null);
  const draggedBlockRef = useRef<HTMLElement | null>(null);
  
  // Slash menu state (Requirements: 18.1-18.6)
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [slashFilter, setSlashFilter] = useState('');
  const slashStartPositionRef = useRef<{ node: Node; offset: number } | null>(null);
  
  // Live Markdown formatter instance (Requirements: 16.1-16.5)
  const liveMarkdownFormatterRef = useRef(new LiveMarkdownFormatter());
  
  // Line-start handler instance (Requirements: 17.1-17.9)
  const lineStartHandlerRef = useRef(new LineStartHandler());
  
  // Multi-block selection state - Requirements: 23.1-23.4
  const [selectedBlocks, setSelectedBlocks] = useState<Set<HTMLElement>>(new Set());
  const [isMarginDragging, setIsMarginDragging] = useState(false);
  const marginDragStartRef = useRef<{ y: number; startBlock: HTMLElement | null }>({ y: 0, startBlock: null });
  const [currentBlockSelected, setCurrentBlockSelected] = useState<HTMLElement | null>(null);

  // Load MathJax on mount
  useEffect(() => {
    if (!window.MathJax) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.async = true;
      script.id = 'MathJax-script';

      window.MathJax = {
        tex: {
          inlineMath: [['$', '$']],
          displayMath: [['$$', '$$']],
        },
        startup: {
          ready: () => {
            console.log('[NotionEditor] MathJax loaded successfully');
            window.MathJax?.startup?.defaultReady?.();
          }
        }
      } as any;

      document.head.appendChild(script);
    }
  }, []);

  // Sync content from props (avec protection du contenu édité)
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    if (content === lastContentRef.current) return;

    lastContentRef.current = content;

    // Convert markdown/HTML to displayable HTML
    const html = contentToHtml(content);
    if (editorRef.current.innerHTML !== html) {
      // Sauvegarder la position du curseur
      const selection = window.getSelection();
      const savedRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;

      editorRef.current.innerHTML = html || '';

      // Restaurer le curseur si possible
      if (savedRange && editorRef.current.contains(savedRange.startContainer)) {
        selection?.removeAllRanges();
        selection?.addRange(savedRange);
      }

      // Typeset equations with MathJax
      if (window.MathJax?.typesetPromise) {
        window.MathJax.typesetPromise([editorRef.current]).catch((err: any) => {
          console.error('[MathJax] Typeset error:', err);
        });
      }
    }
  }, [content]);

  // Clipboard sync when not edited (Requirement 1.4):
  // Auto-update content when clipboard changes AND hasUserEdited === false
  useEffect(() => {
    if (
      clipboardContent !== undefined &&
      !hasUserEdited &&
      clipboardContent !== content
    ) {
      // User hasn't edited, so sync with clipboard automatically
      onChange(clipboardContent);
    }
  }, [clipboardContent, hasUserEdited, content, onChange]);

  // Handle input
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    isInternalChangeRef.current = true;
    const markdown = htmlToMarkdown(editorRef.current);
    lastContentRef.current = markdown;
    onChange(markdown);

    // Parse to Notion blocks
    if (onBlocksChange) {
      try {
        const result = parseContent(markdown);
        if (result.success) {
          onBlocksChange(result.blocks);
        }
      } catch (error) {
        console.error('[NotionEditor] Parse error:', error);
      }
    }

    // Slash menu detection and filtering (Requirements: 18.1, 18.2)
    if (enableSlashCommands) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        
        if (textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || '';
          const cursorPos = range.startOffset;
          
          // Check if we just typed a '/'
          if (!showSlashMenu && cursorPos > 0 && text[cursorPos - 1] === '/') {
            // Check if '/' is at start of line or after whitespace
            const charBefore = cursorPos > 1 ? text[cursorPos - 2] : '';
            if (charBefore === '' || charBefore === ' ' || charBefore === '\n' || cursorPos === 1) {
              // Store the position and open menu
              slashStartPositionRef.current = {
                node: textNode,
                offset: cursorPos - 1
              };
              const rect = range.getBoundingClientRect();
              setSlashMenuPosition({ x: rect.left, y: rect.bottom });
              setSlashFilter('');
              setShowSlashMenu(true);
            }
          } else if (showSlashMenu && slashStartPositionRef.current) {
            // Update filter if menu is open
            const { node, offset } = slashStartPositionRef.current;
            if (textNode === node) {
              const filterText = text.substring(offset + 1, cursorPos);
              // Close menu if space is typed or cursor moved before slash
              if (filterText.includes(' ') || cursorPos <= offset) {
                setShowSlashMenu(false);
                setSlashFilter('');
                slashStartPositionRef.current = null;
              } else {
                setSlashFilter(filterText);
              }
            } else {
              // Cursor moved to different node, close menu
              setShowSlashMenu(false);
              setSlashFilter('');
              slashStartPositionRef.current = null;
            }
          }
        }
      }
    }
  }, [onChange, onBlocksChange, enableSlashCommands, showSlashMenu]);

  // Handle paste - support HTML with conversion
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();

    // Check for images in clipboard
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file && onFilesAdd) {
          handleFileAdd([file]);
          return;
        }
      }
    }

    // Try HTML first
    const html = e.clipboardData.getData('text/html');
    if (html) {
      const markdown = htmlToMarkdownFromString(html);
      insertTextAtCursor(markdown);
      handleInput();
      return;
    }

    // Fallback to plain text
    const text = e.clipboardData.getData('text/plain');
    insertTextAtCursor(text);
    handleInput();
  }, [onFilesAdd, handleInput]);

  // Insert text at cursor position
  const insertTextAtCursor = useCallback((text: string) => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;

    if (selection.rangeCount === 0) {
      // Place cursor at end if no selection
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Move cursor after inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  // Handle file add with quota check
  const handleFileAdd = useCallback(async (files: File[]) => {
    if (!onFilesAdd) return;

    // Check quota
    if (fileQuotaRemaining !== null && fileQuotaRemaining !== undefined) {
      if (fileQuotaRemaining === 0) {
        onFileQuotaExceeded?.();
        return;
      }
      if (files.length > fileQuotaRemaining) {
        showNotification?.(`Seulement ${fileQuotaRemaining} fichier(s) autorisé(s)`, 'warning');
        files = files.slice(0, fileQuotaRemaining);
      }
    }

    // Check file sizes
    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        showNotification?.(`${file.name} dépasse la taille maximale (${formatSize(maxFileSize)})`, 'error');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create AttachedFile objects
    const newFiles: AttachedFile[] = await Promise.all(
      validFiles.map(async (file) => {
        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          preview = await createImagePreview(file);
        }
        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          type: file.type,
          size: file.size,
          preview
        };
      })
    );

    onFilesAdd(newFiles);
  }, [onFilesAdd, fileQuotaRemaining, maxFileSize, onFileQuotaExceeded, showNotification]);

  // Create image preview
  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  // Handle selection for formatting menu
  const handleSelect = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setShowFormattingMenu(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setShowFormattingMenu(true);
  }, []);

  // Handle context menu (right-click)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    setMenuPosition({
      x: e.clientX,
      y: e.clientY
    });
    setShowFormattingMenu(true);
  }, []);

  // Apply formatting
  const applyFormatting = useCallback((action: FormattingAction) => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;

    switch (action) {
      case 'bold':
        document.execCommand('bold');
        break;
      case 'italic':
        document.execCommand('italic');
        break;
      case 'underline':
        document.execCommand('underline');
        break;
      case 'strikethrough':
        document.execCommand('strikethrough');
        break;
      case 'code':
        wrapSelection('<code>', '</code>');
        break;
      case 'link':
        const url = prompt('Entrez l\'URL:');
        if (url) document.execCommand('createLink', false, url);
        break;
      case 'heading1':
        convertToBlock('h1');
        break;
      case 'heading2':
        convertToBlock('h2');
        break;
      case 'heading3':
        convertToBlock('h3');
        break;
      case 'bulletList':
        convertToBulletList();
        break;
      case 'numberedList':
        convertToNumberedList();
        break;
      case 'todo':
        convertToTodo();
        break;
      case 'quote':
        convertToBlock('blockquote');
        break;
      case 'callout':
        insertCallout();
        break;
      case 'divider':
        insertDivider();
        break;
      case 'paragraph':
        convertToBlock('p');
        break;
      case 'toggleList':
        convertToToggle();
        break;
    }

    handleInput();
    setShowFormattingMenu(false);
  }, [handleInput]);

  // Helper: Wrap selection
  const wrapSelection = (before: string, after: string) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    range.deleteContents();

    const wrapper = document.createElement('span');
    wrapper.innerHTML = before + selectedText + after;
    range.insertNode(wrapper);
  };

  /**
   * Convert line to block type (heading, paragraph, blockquote)
   * Requirements: 13.4 - Wrap content in appropriate heading tags
   */
  const convertToBlock = (tag: string) => {
    const selection = window.getSelection();
    if (!selection) return;

    const node = selection.anchorNode;
    if (!node) return;

    // Find the block element containing the selection
    let block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
    while (block && !['P', 'H1', 'H2', 'H3', 'DIV', 'BLOCKQUOTE', 'LI', 'SUMMARY'].includes(block.tagName)) {
      block = block.parentElement;
    }

    if (block && editorRef.current?.contains(block)) {
      let content = block.innerHTML;
      
      // Handle list items - extract from list
      if (block.tagName === 'LI') {
        const parentList = block.parentElement;
        if (parentList && parentList.children.length === 1) {
          // Only item in list, replace the whole list
          const newBlock = document.createElement(tag);
          newBlock.innerHTML = content;
          parentList.replaceWith(newBlock);
          
          // Place cursor in new block
          const range = document.createRange();
          range.selectNodeContents(newBlock);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
      }

      // Handle toggle summary - extract from toggle
      if (block.tagName === 'SUMMARY') {
        const details = block.parentElement;
        if (details) {
          const newBlock = document.createElement(tag);
          newBlock.innerHTML = content;
          details.replaceWith(newBlock);
          
          // Place cursor in new block
          const range = document.createRange();
          range.selectNodeContents(newBlock);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
      }

      // Standard block conversion
      const newBlock = document.createElement(tag);
      newBlock.innerHTML = content;
      block.replaceWith(newBlock);

      // Place cursor in new block
      const range = document.createRange();
      range.selectNodeContents(newBlock);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  /**
   * Convert current block to bullet list
   * Requirements: 2.1 - Display block with visible bullet marker (•) wrapped in <ul><li> structure
   */
  const convertToBulletList = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const node = selection.anchorNode;
    if (!node) return;

    // Find the block element containing the selection
    let block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
    while (block && !['P', 'H1', 'H2', 'H3', 'DIV', 'BLOCKQUOTE', 'LI'].includes(block.tagName)) {
      block = block.parentElement;
    }

    if (block && editorRef.current?.contains(block)) {
      const content = block.innerHTML;
      
      // If already in a list, just change the list type
      if (block.tagName === 'LI') {
        const parentList = block.parentElement;
        if (parentList?.tagName === 'OL') {
          // Convert OL to UL
          const ul = document.createElement('ul');
          ul.innerHTML = parentList.innerHTML;
          parentList.replaceWith(ul);
        }
        return;
      }

      // Create new bullet list structure
      const ul = document.createElement('ul');
      const li = document.createElement('li');
      li.innerHTML = content;
      ul.appendChild(li);
      block.replaceWith(ul);

      // Place cursor inside the new list item
      const range = document.createRange();
      range.selectNodeContents(li);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  /**
   * Convert current block to numbered list
   * Requirements: 2.2 - Display block with visible number prefix wrapped in <ol><li> structure
   */
  const convertToNumberedList = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const node = selection.anchorNode;
    if (!node) return;

    // Find the block element containing the selection
    let block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
    while (block && !['P', 'H1', 'H2', 'H3', 'DIV', 'BLOCKQUOTE', 'LI'].includes(block.tagName)) {
      block = block.parentElement;
    }

    if (block && editorRef.current?.contains(block)) {
      const content = block.innerHTML;
      
      // If already in a list, just change the list type
      if (block.tagName === 'LI') {
        const parentList = block.parentElement;
        if (parentList?.tagName === 'UL') {
          // Convert UL to OL
          const ol = document.createElement('ol');
          ol.innerHTML = parentList.innerHTML;
          parentList.replaceWith(ol);
        }
        return;
      }

      // Create new numbered list structure
      const ol = document.createElement('ol');
      const li = document.createElement('li');
      li.innerHTML = content;
      ol.appendChild(li);
      block.replaceWith(ol);

      // Place cursor inside the new list item
      const range = document.createRange();
      range.selectNodeContents(li);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  /**
   * Convert current block to todo/checkbox
   * Requirements: 2.3 - Display block with visible checkbox using <div class="notion-todo"> structure
   */
  const convertToTodo = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const node = selection.anchorNode;
    if (!node) return;

    // Find the block element containing the selection
    let block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
    while (block && !['P', 'H1', 'H2', 'H3', 'DIV', 'BLOCKQUOTE', 'LI', 'UL', 'OL'].includes(block.tagName)) {
      block = block.parentElement;
    }

    if (block && editorRef.current?.contains(block)) {
      let content = '';
      
      // Handle list items specially
      if (block.tagName === 'LI') {
        content = block.innerHTML;
        const parentList = block.parentElement;
        // If this is the only item in the list, replace the whole list
        if (parentList && parentList.children.length === 1) {
          block = parentList;
        }
      } else {
        content = block.innerHTML;
      }

      // Create todo structure with visible checkbox
      const todo = document.createElement('div');
      todo.className = 'notion-todo';
      todo.innerHTML = `<input type="checkbox"><span contenteditable="true">${content}</span>`;
      block.replaceWith(todo);

      // Place cursor inside the span
      const span = todo.querySelector('span');
      if (span) {
        const range = document.createRange();
        range.selectNodeContents(span);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  /**
   * Convert current block to toggle list
   * Requirements: 6.2 - Display as collapsible <details> element
   */
  const convertToToggle = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const node = selection.anchorNode;
    if (!node) return;

    // Find the block element containing the selection
    let block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
    while (block && !['P', 'H1', 'H2', 'H3', 'DIV', 'BLOCKQUOTE', 'LI'].includes(block.tagName)) {
      block = block.parentElement;
    }

    if (block && editorRef.current?.contains(block)) {
      const content = block.innerHTML;

      // Create toggle structure
      const details = document.createElement('details');
      details.className = 'notion-toggle';
      details.innerHTML = `<summary contenteditable="true">${content}</summary><div contenteditable="true"></div>`;
      block.replaceWith(details);

      // Place cursor inside the summary
      const summary = details.querySelector('summary');
      if (summary) {
        const range = document.createRange();
        range.selectNodeContents(summary);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  // Helper: Insert callout
  const insertCallout = () => {
    const callout = document.createElement('div');
    callout.className = 'notion-callout notion-callout-default';
    callout.innerHTML = '<span class="callout-icon">💡</span><div class="callout-content" contenteditable="true">Note...</div>';

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(callout);
    }
  };

  // Helper: Insert divider
  const insertDivider = () => {
    const hr = document.createElement('hr');
    hr.className = 'notion-divider';

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(hr);
    }
  };

  /**
   * Process live markdown formatting on space/enter key
   * Requirements: 16.1-16.5 - Convert markdown syntax to formatted text as user types
   */
  const processLiveMarkdown = useCallback(() => {
    if (!enableLiveMarkdown || !editorRef.current) return false;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    
    // Get the current text node and its content
    let textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) {
      // Try to find a text node within the current element
      const walker = document.createTreeWalker(
        textNode,
        NodeFilter.SHOW_TEXT,
        null
      );
      textNode = walker.nextNode() || textNode;
      if (textNode.nodeType !== Node.TEXT_NODE) return false;
    }

    const text = textNode.textContent || '';
    const cursorOffset = range.startOffset;
    
    // Get text up to cursor position
    const textBeforeCursor = text.substring(0, cursorOffset);
    
    // Process with LiveMarkdownFormatter
    const result = liveMarkdownFormatterRef.current.processInlineFormatting(
      textBeforeCursor,
      cursorOffset
    );

    if (result.applied) {
      // Create a temporary container to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = result.newText + text.substring(cursorOffset);
      
      // Get the parent element of the text node
      const parentElement = textNode.parentNode;
      if (!parentElement) return false;

      // Replace the text node with the new content
      const fragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      // Find the position to place cursor after replacement
      parentElement.replaceChild(fragment, textNode);
      
      // Move cursor to end of the inserted content
      // Find the last text node in the parent
      const walker = document.createTreeWalker(
        parentElement,
        NodeFilter.SHOW_TEXT,
        null
      );
      let lastTextNode: Node | null = null;
      let node: Node | null;
      while ((node = walker.nextNode())) {
        lastTextNode = node;
      }
      
      if (lastTextNode) {
        const newRange = document.createRange();
        newRange.setStart(lastTextNode, (lastTextNode.textContent || '').length);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }

      return true;
    }

    return false;
  }, [enableLiveMarkdown]);

  /**
   * Process line-start shortcuts on space key
   * Requirements: 17.1-17.9 - Convert line-start markdown shortcuts to block types
   * 
   * Detects patterns like:
   * - `- `, `* `, `+ ` → bullet list (17.1)
   * - `[]` → todo checkbox (17.2)
   * - `1. `, `a. `, `i. ` → numbered list (17.3)
   * - `# ` → H1 heading (17.4)
   * - `## ` → H2 heading (17.5)
   * - `### ` → H3 heading (17.6)
   * - `> ` (not `[!`) → toggle list (17.7)
   * - `" ` → quote block (17.8)
   * - `---` → divider (17.9)
   */
  const processLineStartShortcut = useCallback((): boolean => {
    if (!editorRef.current) return false;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    
    // Find the current block element containing the cursor
    let currentNode = range.startContainer;
    let blockElement: HTMLElement | null = null;
    
    // Walk up to find the block-level element
    if (currentNode.nodeType === Node.TEXT_NODE) {
      blockElement = currentNode.parentElement;
    } else {
      blockElement = currentNode as HTMLElement;
    }
    
    // Find the nearest block-level parent
    while (blockElement && !['P', 'DIV', 'H1', 'H2', 'H3', 'LI', 'BLOCKQUOTE'].includes(blockElement.tagName)) {
      blockElement = blockElement.parentElement;
    }
    
    if (!blockElement || !editorRef.current.contains(blockElement)) return false;
    
    // Get the text content of the current line/block
    const lineText = blockElement.textContent || '';
    
    // Process with LineStartHandler
    const result = lineStartHandlerRef.current.processLineStart(lineText);
    
    if (!result.converted) return false;
    
    // Apply the block transformation based on the detected type
    const applyBlockTransformation = (blockType: BlockType, content: string, metadata?: Record<string, any>) => {
      switch (blockType) {
        case 'heading_1': {
          const h1 = document.createElement('h1');
          h1.textContent = content;
          blockElement!.replaceWith(h1);
          placeCursorAtEnd(h1);
          return true;
        }
        case 'heading_2': {
          const h2 = document.createElement('h2');
          h2.textContent = content;
          blockElement!.replaceWith(h2);
          placeCursorAtEnd(h2);
          return true;
        }
        case 'heading_3': {
          const h3 = document.createElement('h3');
          h3.textContent = content;
          blockElement!.replaceWith(h3);
          placeCursorAtEnd(h3);
          return true;
        }
        case 'bulleted_list': {
          const ul = document.createElement('ul');
          const li = document.createElement('li');
          li.textContent = content;
          ul.appendChild(li);
          blockElement!.replaceWith(ul);
          placeCursorAtEnd(li);
          return true;
        }
        case 'numbered_list': {
          const ol = document.createElement('ol');
          const li = document.createElement('li');
          li.textContent = content;
          ol.appendChild(li);
          blockElement!.replaceWith(ol);
          placeCursorAtEnd(li);
          return true;
        }
        case 'todo': {
          const todo = document.createElement('div');
          todo.className = 'notion-todo';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = metadata?.checked || false;
          const span = document.createElement('span');
          span.contentEditable = 'true';
          span.textContent = content;
          todo.appendChild(checkbox);
          todo.appendChild(span);
          blockElement!.replaceWith(todo);
          placeCursorAtEnd(span);
          return true;
        }
        case 'toggle': {
          const details = document.createElement('details');
          details.className = 'notion-toggle';
          const summary = document.createElement('summary');
          summary.contentEditable = 'true';
          summary.textContent = content;
          const contentDiv = document.createElement('div');
          contentDiv.contentEditable = 'true';
          details.appendChild(summary);
          details.appendChild(contentDiv);
          blockElement!.replaceWith(details);
          placeCursorAtEnd(summary);
          return true;
        }
        case 'quote': {
          const blockquote = document.createElement('blockquote');
          blockquote.textContent = content;
          blockElement!.replaceWith(blockquote);
          placeCursorAtEnd(blockquote);
          return true;
        }
        case 'divider': {
          const hr = document.createElement('hr');
          hr.className = 'notion-divider';
          // Create a new paragraph after the divider for continued typing
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          blockElement!.replaceWith(hr);
          hr.after(p);
          placeCursorAtEnd(p);
          return true;
        }
        default:
          return false;
      }
    };
    
    // Helper to place cursor at end of element
    const placeCursorAtEnd = (element: HTMLElement) => {
      const newRange = document.createRange();
      newRange.selectNodeContents(element);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    };
    
    return applyBlockTransformation(result.blockType, result.content, result.metadata);
  }, []);

  /**
   * Get cursor position for slash menu positioning
   * Requirements: 18.1 - Position menu near cursor
   */
  const getCursorPosition = useCallback((): { x: number; y: number } => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { x: 0, y: 0 };
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    return {
      x: rect.left,
      y: rect.bottom
    };
  }, []);

  /**
   * Open slash menu at current cursor position
   * Requirements: 18.1 - Display searchable menu when user types '/'
   */
  const openSlashMenu = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    // Store the position where '/' was typed for later removal
    slashStartPositionRef.current = {
      node: range.startContainer,
      offset: range.startOffset - 1 // Position before the '/'
    };

    const position = getCursorPosition();
    setSlashMenuPosition(position);
    setSlashFilter('');
    setShowSlashMenu(true);
  }, [getCursorPosition]);

  /**
   * Close slash menu and clean up
   * Requirements: 18.6 - Close menu on Escape
   */
  const closeSlashMenu = useCallback(() => {
    setShowSlashMenu(false);
    setSlashFilter('');
    slashStartPositionRef.current = null;
  }, []);

  /**
   * Remove the slash and filter text from the editor
   */
  const removeSlashText = useCallback(() => {
    if (!editorRef.current || !slashStartPositionRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    const { node, offset } = slashStartPositionRef.current;
    
    // Calculate how many characters to remove (/ + filter text)
    const charsToRemove = 1 + slashFilter.length;
    
    try {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const text = node.textContent;
        // Remove the slash and filter text
        const newText = text.substring(0, offset) + text.substring(offset + charsToRemove);
        node.textContent = newText;
        
        // Place cursor at the position where slash was
        // Only if the node is still in the document
        if (document.contains(node)) {
          const range = document.createRange();
          range.setStart(node, Math.min(offset, newText.length));
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } catch (error) {
      console.error('[SlashMenu] Error removing slash text:', error);
    }
  }, [slashFilter]);

  /**
   * Handle slash command selection
   * Requirements: 18.3, 18.4, 18.5 - Execute selected command
   */
  const handleSlashCommandSelect = useCallback((command: SlashCommand) => {
    // Remove the slash and filter text first
    removeSlashText();
    
    // Close the menu
    closeSlashMenu();

    // Execute the command based on type
    switch (command.type) {
      case 'block':
        // Insert block type (Requirements: 18.3)
        executeBlockCommand(command.id);
        break;
      case 'action':
        // Execute action (Requirements: 18.4)
        executeActionCommand(command.id);
        break;
      case 'color':
        // Change color (Requirements: 18.5)
        executeColorCommand(command.id, command.color);
        break;
    }

    // Trigger input handler to sync state
    handleInput();
  }, [removeSlashText, closeSlashMenu, handleInput]);

  /**
   * Execute block insertion command
   * Requirements: 18.3 - Insert corresponding block type
   */
  const executeBlockCommand = useCallback((blockId: string) => {
    switch (blockId) {
      case 'text':
        // Already in a text block, nothing to do
        break;
      case 'heading_1':
        convertToBlock('h1');
        break;
      case 'heading_2':
        convertToBlock('h2');
        break;
      case 'heading_3':
        convertToBlock('h3');
        break;
      case 'bulleted_list':
        convertToBulletList();
        break;
      case 'numbered_list':
        convertToNumberedList();
        break;
      case 'todo':
        convertToTodo();
        break;
      case 'toggle':
        convertToToggle();
        break;
      case 'quote':
        convertToBlock('blockquote');
        break;
      case 'divider':
        insertDivider();
        break;
      case 'callout':
        insertCallout();
        break;
    }
  }, []);

  /**
   * Execute action command on current block
   * Requirements: 18.4 - Execute actions (delete, duplicate, move)
   */
  const executeActionCommand = useCallback((actionId: string) => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;

    const node = selection.anchorNode;
    if (!node) return;

    // Find the block element containing the selection
    let block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
    while (block && !['P', 'H1', 'H2', 'H3', 'DIV', 'BLOCKQUOTE', 'LI', 'UL', 'OL', 'DETAILS'].includes(block.tagName)) {
      block = block.parentElement;
    }

    if (!block || !editorRef.current.contains(block)) return;

    switch (actionId) {
      case 'delete':
        // Delete the current block
        const nextSibling = block.nextElementSibling;
        const prevSibling = block.previousElementSibling;
        block.remove();
        
        // Move cursor to adjacent block
        const targetBlock = nextSibling || prevSibling;
        if (targetBlock) {
          const range = document.createRange();
          range.selectNodeContents(targetBlock);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        break;

      case 'duplicate':
        // Duplicate the current block
        const clone = block.cloneNode(true) as HTMLElement;
        block.after(clone);
        
        // Move cursor to the duplicated block
        const dupRange = document.createRange();
        dupRange.selectNodeContents(clone);
        dupRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(dupRange);
        break;

      case 'move_to':
        // For now, just show a notification - full implementation would need a destination picker
        showNotification?.('Move to: Feature coming soon', 'info');
        break;
    }
  }, [showNotification]);

  /**
   * Execute color command on current block
   * Requirements: 18.5 - Change color of current block
   */
  const executeColorCommand = useCallback((colorId: string, color?: string) => {
    if (!color) return;

    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;

    const node = selection.anchorNode;
    if (!node) return;

    // Find the block element containing the selection
    let block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
    while (block && !['P', 'H1', 'H2', 'H3', 'DIV', 'BLOCKQUOTE', 'LI', 'SPAN'].includes(block.tagName)) {
      block = block.parentElement;
    }

    if (!block || !editorRef.current.contains(block)) return;

    // Apply the color to the block
    block.style.color = color;
  }, []);

  /**
   * Handle input changes to track slash filter
   * Requirements: 18.2 - Track filter text after '/'
   */
  const handleSlashInput = useCallback(() => {
    if (!showSlashMenu || !slashStartPositionRef.current || !editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const { node, offset } = slashStartPositionRef.current;

    // Check if we're still in the same text node
    if (range.startContainer === node && node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      // Extract the filter text (everything after the '/' up to cursor)
      const filterText = text.substring(offset + 1, range.startOffset);
      
      // If there's a space in the filter, close the menu
      if (filterText.includes(' ')) {
        closeSlashMenu();
        return;
      }
      
      setSlashFilter(filterText);
    } else {
      // Cursor moved to a different node, close the menu
      closeSlashMenu();
    }
  }, [showSlashMenu, closeSlashMenu]);

  // Keyboard shortcuts - moved after multi-block selection handlers
  // (defined below after multi-block selection functions)

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileAdd(files);
    }
  }, [handleFileAdd]);

  // Toggle image expansion
  const toggleImageExpand = useCallback((imageId: string) => {
    setExpandedImages(prev => {
      const next = new Set(prev);
      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }
      return next;
    });
  }, []);

  /**
   * Find the block element at a given point
   * Requirements: 22.1 - Display drag handle on hover
   */
  const findBlockAtPoint = useCallback((x: number, y: number): HTMLElement | null => {
    if (!editorRef.current) return null;
    
    const blockSelectors = 'p, h1, h2, h3, ul, ol, blockquote, pre, hr, details, .notion-todo, .notion-callout, .notion-image-block, .notion-file-block, .notion-video-block, .notion-audio-block, .notion-embed-block, .notion-bookmark-block, table';
    const blocks = editorRef.current.querySelectorAll(blockSelectors);
    
    for (const block of blocks) {
      const rect = block.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        return block as HTMLElement;
      }
    }
    return null;
  }, []);

  /**
   * Handle mouse move over editor to show drag handle
   * Requirements: 22.1 - Display drag handle (⋮⋮) in left margin on hover
   */
  const handleEditorMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingBlock || readOnly) return;
    
    const block = findBlockAtPoint(e.clientX, e.clientY);
    
    if (block && block !== hoveredBlock) {
      const editorRect = editorRef.current?.getBoundingClientRect();
      const blockRect = block.getBoundingClientRect();
      
      if (editorRect) {
        setHoveredBlock(block);
        setDragHandlePosition({
          top: blockRect.top - editorRect.top + (editorRef.current?.scrollTop || 0),
          left: -32 // Position in left margin
        });
        setShowDragHandle(true);
      }
    } else if (!block) {
      setShowDragHandle(false);
      setHoveredBlock(null);
    }
  }, [findBlockAtPoint, hoveredBlock, isDraggingBlock, readOnly]);

  /**
   * Handle mouse leave from editor
   */
  const handleEditorMouseLeave = useCallback(() => {
    // Delay hiding to allow clicking on drag handle
    setTimeout(() => {
      if (!isDraggingBlock) {
        setShowDragHandle(false);
        setHoveredBlock(null);
      }
    }, 100);
  }, [isDraggingBlock]);

  /**
   * Handle "Turn into" action from drag handle menu
   * Requirements: 22.5 - Transform block to selected type
   */
  const handleTurnInto = useCallback((blockType: DragBlockType) => {
    if (!hoveredBlock || !editorRef.current) return;
    
    const selection = window.getSelection();
    const content = hoveredBlock.textContent || '';
    
    let newElement: HTMLElement;
    
    switch (blockType) {
      case 'paragraph':
        newElement = document.createElement('p');
        newElement.textContent = content;
        break;
      case 'heading_1':
        newElement = document.createElement('h1');
        newElement.textContent = content;
        break;
      case 'heading_2':
        newElement = document.createElement('h2');
        newElement.textContent = content;
        break;
      case 'heading_3':
        newElement = document.createElement('h3');
        newElement.textContent = content;
        break;
      case 'bulleted_list': {
        const ul = document.createElement('ul');
        const li = document.createElement('li');
        li.textContent = content;
        ul.appendChild(li);
        newElement = ul;
        break;
      }
      case 'numbered_list': {
        const ol = document.createElement('ol');
        const li = document.createElement('li');
        li.textContent = content;
        ol.appendChild(li);
        newElement = ol;
        break;
      }
      case 'todo': {
        const todo = document.createElement('div');
        todo.className = 'notion-todo';
        todo.innerHTML = `<input type="checkbox"><span contenteditable="true">${content}</span>`;
        newElement = todo;
        break;
      }
      case 'toggle': {
        const details = document.createElement('details');
        details.className = 'notion-toggle';
        details.innerHTML = `<summary contenteditable="true">${content}</summary><div contenteditable="true"></div>`;
        newElement = details;
        break;
      }
      case 'quote':
        newElement = document.createElement('blockquote');
        newElement.textContent = content;
        break;
      case 'divider':
        newElement = document.createElement('hr');
        newElement.className = 'notion-divider';
        break;
      case 'callout': {
        const callout = document.createElement('div');
        callout.className = 'notion-callout notion-callout-default';
        callout.innerHTML = `<span class="callout-icon">💡</span><div class="callout-content" contenteditable="true">${content}</div>`;
        newElement = callout;
        break;
      }
      default:
        return;
    }
    
    hoveredBlock.replaceWith(newElement);
    setShowDragHandle(false);
    setHoveredBlock(null);
    handleInput();
  }, [hoveredBlock, handleInput]);

  /**
   * Handle "Color" action from drag handle menu
   * Requirements: 22.6 - Change text or background color
   */
  const handleColorChange = useCallback((textColor?: string, backgroundColor?: string) => {
    if (!hoveredBlock) return;
    
    if (textColor) {
      hoveredBlock.style.color = textColor;
    }
    if (backgroundColor) {
      hoveredBlock.style.backgroundColor = backgroundColor;
    }
    
    handleInput();
  }, [hoveredBlock, handleInput]);

  /**
   * Handle "Duplicate" action from drag handle menu
   * Requirements: 22.7 - Create exact copy of block
   */
  const handleDuplicateBlock = useCallback(() => {
    if (!hoveredBlock) return;
    
    const clone = hoveredBlock.cloneNode(true) as HTMLElement;
    hoveredBlock.after(clone);
    
    setShowDragHandle(false);
    setHoveredBlock(null);
    handleInput();
  }, [hoveredBlock, handleInput]);

  /**
   * Handle "Delete" action from drag handle menu
   * Requirements: 22.8 - Remove block
   */
  const handleDeleteBlock = useCallback(() => {
    if (!hoveredBlock) return;
    
    const nextSibling = hoveredBlock.nextElementSibling;
    const prevSibling = hoveredBlock.previousElementSibling;
    
    hoveredBlock.remove();
    
    // Move cursor to adjacent block
    const selection = window.getSelection();
    const targetBlock = nextSibling || prevSibling;
    if (targetBlock && selection) {
      const range = document.createRange();
      range.selectNodeContents(targetBlock);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    setShowDragHandle(false);
    setHoveredBlock(null);
    handleInput();
  }, [hoveredBlock, handleInput]);

  /**
   * Handle drag start for block reordering
   * Requirements: 22.2 - Show visual guides during drag
   */
  const handleBlockDragStart = useCallback((e: React.DragEvent) => {
    if (!hoveredBlock) return;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'block');
    
    draggedBlockRef.current = hoveredBlock;
    setIsDraggingBlock(true);
    
    // Add dragging class for visual feedback
    hoveredBlock.classList.add('dragging-block');
  }, [hoveredBlock]);

  /**
   * Handle drag end for block reordering
   */
  const handleBlockDragEnd = useCallback((e: React.DragEvent) => {
    setIsDraggingBlock(false);
    setDropIndicator(null);
    
    if (draggedBlockRef.current) {
      draggedBlockRef.current.classList.remove('dragging-block');
      draggedBlockRef.current = null;
    }
  }, []);

  /**
   * Handle drag over for block reordering
   * Requirements: 22.2 - Show visual guides indicating drop position
   */
  const handleBlockDragOver = useCallback((e: React.DragEvent) => {
    if (!isDraggingBlock || !draggedBlockRef.current) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const block = findBlockAtPoint(e.clientX, e.clientY);
    if (block && block !== draggedBlockRef.current) {
      const rect = block.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';
      
      setDropIndicator({ element: block, position });
    } else {
      setDropIndicator(null);
    }
  }, [isDraggingBlock, findBlockAtPoint]);

  /**
   * Handle drop for block reordering
   * Requirements: 22.3 - Move block to new position
   */
  const handleBlockDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    if (!isDraggingBlock || !draggedBlockRef.current || !dropIndicator) return;
    
    const { element: targetBlock, position } = dropIndicator;
    
    if (position === 'before') {
      targetBlock.before(draggedBlockRef.current);
    } else {
      targetBlock.after(draggedBlockRef.current);
    }
    
    setIsDraggingBlock(false);
    setDropIndicator(null);
    draggedBlockRef.current.classList.remove('dragging-block');
    draggedBlockRef.current = null;
    
    handleInput();
  }, [isDraggingBlock, dropIndicator, handleInput]);

  // ============================================
  // MULTI-BLOCK SELECTION - Requirements: 23.1-23.4
  // ============================================

  /**
   * Clear all block selections
   */
  const clearBlockSelection = useCallback(() => {
    selectedBlocks.forEach(block => {
      block.classList.remove('notion-block-selected');
    });
    setSelectedBlocks(new Set());
    setCurrentBlockSelected(null);
  }, [selectedBlocks]);

  /**
   * Select a single block
   */
  const selectBlock = useCallback((block: HTMLElement, addToSelection: boolean = false) => {
    if (addToSelection) {
      setSelectedBlocks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(block)) {
          block.classList.remove('notion-block-selected');
          newSet.delete(block);
        } else {
          block.classList.add('notion-block-selected');
          newSet.add(block);
        }
        return newSet;
      });
    } else {
      clearBlockSelection();
      block.classList.add('notion-block-selected');
      setSelectedBlocks(new Set([block]));
    }
    setCurrentBlockSelected(block);
  }, [clearBlockSelection]);

  /**
   * Select blocks between two blocks (for range selection)
   */
  const selectBlockRange = useCallback((startBlock: HTMLElement, endBlock: HTMLElement) => {
    if (!editorRef.current) return;
    
    const blockSelectors = 'p, h1, h2, h3, ul, ol, blockquote, pre, hr, details, .notion-todo, .notion-callout, .notion-image-block, .notion-file-block, .notion-video-block, .notion-audio-block, .notion-embed-block, .notion-bookmark-block, table';
    const allBlocks = Array.from(editorRef.current.querySelectorAll(blockSelectors)) as HTMLElement[];
    
    const startIndex = allBlocks.indexOf(startBlock);
    const endIndex = allBlocks.indexOf(endBlock);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    // Clear previous selection
    clearBlockSelection();
    
    // Select all blocks in range
    const newSelection = new Set<HTMLElement>();
    for (let i = minIndex; i <= maxIndex; i++) {
      const block = allBlocks[i];
      block.classList.add('notion-block-selected');
      newSelection.add(block);
    }
    
    setSelectedBlocks(newSelection);
  }, [clearBlockSelection]);

  /**
   * Handle margin mouse down for drag selection
   * Requirements: 23.1 - Select entire blocks when dragging from margin
   */
  const handleMarginMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    
    // Check if click is in the left margin area (first 32px)
    const editorRect = editorRef.current?.getBoundingClientRect();
    if (!editorRect) return;
    
    const relativeX = e.clientX - editorRect.left;
    
    // Only trigger margin drag if clicking in the left margin (0-32px)
    if (relativeX > 32) return;
    
    const block = findBlockAtPoint(e.clientX + 40, e.clientY); // Offset to find block to the right
    if (!block) return;
    
    e.preventDefault();
    setIsMarginDragging(true);
    marginDragStartRef.current = { y: e.clientY, startBlock: block };
    
    // Select the initial block
    selectBlock(block);
  }, [readOnly, findBlockAtPoint, selectBlock]);

  /**
   * Handle margin mouse move for drag selection
   * Requirements: 23.1 - Select entire blocks when dragging from margin
   */
  const handleMarginMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMarginDragging || !marginDragStartRef.current.startBlock) return;
    
    const currentBlock = findBlockAtPoint(e.clientX + 40, e.clientY);
    if (currentBlock && currentBlock !== marginDragStartRef.current.startBlock) {
      selectBlockRange(marginDragStartRef.current.startBlock, currentBlock);
    }
  }, [isMarginDragging, findBlockAtPoint, selectBlockRange]);

  /**
   * Handle margin mouse up to end drag selection
   */
  const handleMarginMouseUp = useCallback(() => {
    setIsMarginDragging(false);
    marginDragStartRef.current = { y: 0, startBlock: null };
  }, []);

  /**
   * Handle Escape key to select entire current block
   * Requirements: 23.3 - Select entire block on Escape while editing
   */
  const handleEscapeToSelectBlock = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return false;
    
    const node = selection.anchorNode;
    if (!node) return false;
    
    // Find the block element containing the cursor
    let block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
    while (block && !['P', 'H1', 'H2', 'H3', 'DIV', 'BLOCKQUOTE', 'LI', 'UL', 'OL', 'DETAILS', 'PRE', 'TABLE'].includes(block.tagName)) {
      block = block.parentElement;
    }
    
    // Also check for custom block classes
    if (!block) {
      block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
      while (block && !block.classList.contains('notion-todo') && 
             !block.classList.contains('notion-callout') &&
             !block.classList.contains('notion-image-block') &&
             !block.classList.contains('notion-file-block')) {
        block = block.parentElement;
      }
    }
    
    if (block && editorRef.current.contains(block)) {
      // Clear text selection
      selection.removeAllRanges();
      
      // Select the block
      selectBlock(block);
      return true;
    }
    
    return false;
  }, [selectBlock]);

  /**
   * Delete selected blocks
   * Requirements: 23.4 - Bulk delete action
   */
  const deleteSelectedBlocks = useCallback(() => {
    if (selectedBlocks.size === 0) return;
    
    // Find the next block to focus after deletion
    const blocksArray = Array.from(selectedBlocks);
    const lastBlock = blocksArray[blocksArray.length - 1];
    const nextSibling = lastBlock.nextElementSibling;
    const prevSibling = blocksArray[0].previousElementSibling;
    
    // Delete all selected blocks
    selectedBlocks.forEach(block => {
      block.remove();
    });
    
    // Clear selection
    clearBlockSelection();
    
    // Focus on adjacent block
    const targetBlock = nextSibling || prevSibling;
    if (targetBlock && document.contains(targetBlock)) {
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(targetBlock);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
    handleInput();
  }, [selectedBlocks, clearBlockSelection, handleInput]);

  /**
   * Duplicate selected blocks
   * Requirements: 23.4 - Bulk duplicate action
   */
  const duplicateSelectedBlocks = useCallback(() => {
    if (selectedBlocks.size === 0) return;
    
    const blocksArray = Array.from(selectedBlocks);
    const lastBlock = blocksArray[blocksArray.length - 1];
    
    // Clone all selected blocks and insert after the last one
    const clones: HTMLElement[] = [];
    blocksArray.forEach(block => {
      const clone = block.cloneNode(true) as HTMLElement;
      clone.classList.remove('notion-block-selected');
      clones.push(clone);
    });
    
    // Insert clones after the last selected block
    let insertAfter = lastBlock;
    clones.forEach(clone => {
      insertAfter.after(clone);
      insertAfter = clone;
    });
    
    // Clear current selection and select the clones
    clearBlockSelection();
    const newSelection = new Set<HTMLElement>();
    clones.forEach(clone => {
      clone.classList.add('notion-block-selected');
      newSelection.add(clone);
    });
    setSelectedBlocks(newSelection);
    
    handleInput();
  }, [selectedBlocks, clearBlockSelection, handleInput]);

  /**
   * Move selected blocks up
   * Requirements: 23.4 - Bulk move action
   */
  const moveSelectedBlocksUp = useCallback(() => {
    if (selectedBlocks.size === 0) return;
    
    const blocksArray = Array.from(selectedBlocks);
    const firstBlock = blocksArray[0];
    const prevSibling = firstBlock.previousElementSibling;
    
    if (!prevSibling) return; // Already at top
    
    // Move all selected blocks before the previous sibling
    blocksArray.forEach(block => {
      prevSibling.before(block);
    });
    
    handleInput();
  }, [selectedBlocks, handleInput]);

  /**
   * Move selected blocks down
   * Requirements: 23.4 - Bulk move action
   */
  const moveSelectedBlocksDown = useCallback(() => {
    if (selectedBlocks.size === 0) return;
    
    const blocksArray = Array.from(selectedBlocks);
    const lastBlock = blocksArray[blocksArray.length - 1];
    const nextSibling = lastBlock.nextElementSibling;
    
    if (!nextSibling) return; // Already at bottom
    
    // Move all selected blocks after the next sibling
    for (let i = blocksArray.length - 1; i >= 0; i--) {
      nextSibling.after(blocksArray[i]);
    }
    
    handleInput();
  }, [selectedBlocks, handleInput]);

  // Global mouse up handler for margin drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isMarginDragging) {
        setIsMarginDragging(false);
        marginDragStartRef.current = { y: 0, startBlock: null };
      }
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isMarginDragging]);

  // Clear selection when clicking outside selected blocks
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (selectedBlocks.size === 0) return;
      
      const target = e.target as HTMLElement;
      
      // Check if click is inside a selected block
      let isInsideSelectedBlock = false;
      selectedBlocks.forEach(block => {
        if (block.contains(target)) {
          isInsideSelectedBlock = true;
        }
      });
      
      // Check if click is on the editor margin (for new selection)
      const editorRect = editorRef.current?.getBoundingClientRect();
      if (editorRect) {
        const relativeX = e.clientX - editorRect.left;
        if (relativeX <= 32) {
          return; // Don't clear if clicking in margin
        }
      }
      
      if (!isInsideSelectedBlock && editorRef.current?.contains(target)) {
        clearBlockSelection();
      }
    };
    
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [selectedBlocks, clearBlockSelection]);

  // Keyboard shortcuts (moved here after multi-block selection handlers)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey;

    if (isMod) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          applyFormatting('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormatting('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormatting('underline');
          break;
        case 'e':
          e.preventDefault();
          applyFormatting('code');
          break;
        case 'k':
          e.preventDefault();
          applyFormatting('link');
          break;
      }
    }

    // Line-start shortcuts processing on space key (Requirements: 17.1-17.9)
    if (e.key === ' ') {
      const lineStartConverted = processLineStartShortcut();
      if (lineStartConverted) {
        e.preventDefault();
        handleInput();
        return;
      }
    }

    // Live Markdown processing on space or enter (Requirements: 16.1-16.5)
    if (enableLiveMarkdown && (e.key === ' ' || e.key === 'Enter')) {
      const formatted = processLiveMarkdown();
      if (formatted) {
        handleInput();
      }
    }

    // Tab handling
    if (e.key === 'Tab') {
      e.preventDefault();
      insertTextAtCursor('    ');
      handleInput();
    }

    // Close slash menu on Escape (Requirements: 18.6)
    if (e.key === 'Escape' && showSlashMenu) {
      e.preventDefault();
      closeSlashMenu();
      return;
    }

    // Escape to select block (Requirements: 23.3)
    if (e.key === 'Escape' && !showSlashMenu) {
      e.preventDefault();
      if (selectedBlocks.size > 0) {
        clearBlockSelection();
      } else {
        handleEscapeToSelectBlock();
      }
      return;
    }

    // Bulk actions for selected blocks (Requirements: 23.4)
    if (selectedBlocks.size > 0) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        deleteSelectedBlocks();
        return;
      }

      if (isMod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedBlocks();
        return;
      }

      if (isMod && e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelectedBlocksUp();
        return;
      }

      if (isMod && e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelectedBlocksDown();
        return;
      }

      if (isMod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (editorRef.current) {
          const blockSelectors = 'p, h1, h2, h3, ul, ol, blockquote, pre, hr, details, .notion-todo, .notion-callout, .notion-image-block, .notion-file-block, .notion-video-block, .notion-audio-block, .notion-embed-block, .notion-bookmark-block, table';
          const allBlocks = Array.from(editorRef.current.querySelectorAll(blockSelectors)) as HTMLElement[];
          clearBlockSelection();
          const newSelection = new Set<HTMLElement>();
          allBlocks.forEach(block => {
            block.classList.add('notion-block-selected');
            newSelection.add(block);
          });
          setSelectedBlocks(newSelection);
        }
        return;
      }
    }
  }, [applyFormatting, insertTextAtCursor, handleInput, enableLiveMarkdown, processLiveMarkdown, processLineStartShortcut, showSlashMenu, closeSlashMenu, selectedBlocks, clearBlockSelection, handleEscapeToSelectBlock, deleteSelectedBlocks, duplicateSelectedBlocks, moveSelectedBlocksUp, moveSelectedBlocksDown]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    insertAtCursor: (text: string) => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      insertTextAtCursor(text);
      handleInput();
    },

    insertFileAtCursor: (file: AttachedFile) => {
      if (onFilesAdd) {
        onFilesAdd([file]);
      }
    },

    insertImageAtCursor: (image: ClipboardImage) => {
      // Images are handled via the images prop
      console.log('[NotionEditor] insertImageAtCursor called', image);
    },

    focus: () => {
      editorRef.current?.focus();
    },

    getSelection: () => {
      return window.getSelection();
    },

    getContent: () => {
      return lastContentRef.current;
    }
  }), [handleInput, insertTextAtCursor, onFilesAdd]);

  const isEmpty = !content || content.trim() === '';
  
  // Reset button visibility logic (Requirements 1.1, 1.3):
  // Show when hasUserEdited === true AND content !== clipboardContent
  // Hide otherwise (when user hasn't edited OR content matches clipboard)
  const showResetButton = hasUserEdited && 
    onResetToClipboard && 
    clipboardContent !== undefined && 
    content !== clipboardContent;

  // Get image source helper
  const getImageSrc = useCallback((image: ClipboardImage): string | null => {
    if (image.preview) return image.preview;
    if (typeof image.data === 'string') {
      return image.data.startsWith('data:') ? image.data : `data:image/png;base64,${image.data}`;
    }
    if (typeof image.content === 'string') {
      return image.content.startsWith('data:') ? image.content : `data:image/png;base64,${image.content}`;
    }
    if (image.url) return image.url;
    if (image.path) return `file://${image.path}`;
    return null;
  }, []);

  return (
    <div
      className={`notion-editor-wrapper relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Reset button */}
      {showResetButton && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={onResetToClipboard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            title="Annuler les modifications et revenir au clipboard"
          >
            <RotateCcw size={12} />
            <span>Réinitialiser</span>
          </button>
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 bg-purple-50/90 dark:bg-purple-900/30 border-2 border-dashed border-purple-400 dark:border-purple-500 rounded-xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-purple-600 dark:text-purple-400">
            <Upload size={32} />
            <span className="text-sm font-medium">Déposez vos fichiers ici</span>
          </div>
        </div>
      )}

      {/* Placeholder */}
      {isEmpty && !isFocused && images.length === 0 && attachedFiles.length === 0 && (
        <div className="absolute top-0 left-0 pointer-events-none text-[#9b9a97] dark:text-[#5a5a5a] text-[16px] leading-[1.5]">
          {placeholder}
        </div>
      )}

      {/* Images inline (style Notion) */}
      {images.length > 0 && (
        <div className="mb-4 space-y-3">
          {images.map((image, index) => {
            const imageId = image.id || `img-${index}`;
            const imageSrc = getImageSrc(image);
            const isExpanded = expandedImages.has(imageId);

            return (
              <div
                key={imageId}
                className={`notion-image-block group relative rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 ${
                  isExpanded ? 'max-w-full' : 'max-w-md'
                }`}
              >
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={`Image ${index + 1}`}
                    className={`w-full object-contain ${isExpanded ? 'max-h-[80vh]' : 'max-h-64'}`}
                  />
                ) : (
                  <div className="h-32 flex items-center justify-center text-gray-400">
                    <ImageIcon size={24} />
                  </div>
                )}

                {/* Image controls */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleImageExpand(imageId)}
                    className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md transition-colors"
                    title={isExpanded ? 'Réduire' : 'Agrandir'}
                  >
                    {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  {onImageRemove && (
                    <button
                      onClick={() => onImageRemove(index)}
                      className="p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-md transition-colors"
                      title="Supprimer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Image size info */}
                {image.size && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                    {formatSize(image.size)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Editor zone with drag handle support and multi-block selection */}
      <div 
        className="notion-editor-container relative"
        onMouseMove={(e) => {
          handleEditorMouseMove(e);
          handleMarginMouseMove(e);
        }}
        onMouseLeave={handleEditorMouseLeave}
        onMouseDown={handleMarginMouseDown}
        onMouseUp={handleMarginMouseUp}
        onDragOver={handleBlockDragOver}
        onDrop={handleBlockDrop}
      >
        {/* Drag Handle - Requirements: 22.1 */}
        {showDragHandle && hoveredBlock && !readOnly && (
          <div 
            className="drag-handle-wrapper absolute z-50"
            style={{
              top: dragHandlePosition.top,
              left: dragHandlePosition.left,
            }}
          >
            <DragHandle
              blockElement={hoveredBlock}
              onTurnInto={handleTurnInto}
              onColorChange={handleColorChange}
              onDuplicate={handleDuplicateBlock}
              onDelete={handleDeleteBlock}
              onDragStart={handleBlockDragStart}
              onDragEnd={handleBlockDragEnd}
            />
          </div>
        )}

        {/* Drop Indicator - Requirements: 22.2 */}
        {dropIndicator && (
          <div 
            className="drop-indicator-line absolute left-8 right-0 h-[3px] bg-blue-500 rounded z-40 pointer-events-none"
            style={{
              top: dropIndicator.position === 'before' 
                ? dropIndicator.element.getBoundingClientRect().top - (editorRef.current?.getBoundingClientRect().top || 0) + (editorRef.current?.scrollTop || 0) - 2
                : dropIndicator.element.getBoundingClientRect().bottom - (editorRef.current?.getBoundingClientRect().top || 0) + (editorRef.current?.scrollTop || 0) - 1,
            }}
          />
        )}

        <div
          ref={editorRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onMouseUp={handleSelect}
          onContextMenu={handleContextMenu}
          className="notion-editor outline-none min-h-[200px] text-[16px] leading-[1.5] text-[#37352f] dark:text-[#e3e3e3] pl-8"
          style={{
            fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
            WebkitFontSmoothing: 'antialiased',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        />
      </div>

      {/* Attached files inline (style Notion) - Requirements: 5.2 */}
      {attachedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {attachedFiles.map((file) => {
            // Get appropriate icon based on file type (Requirements: 5.2)
            const fileIconInfo = file.type 
              ? getFileIcon(file.type) 
              : getFileIconByExtension(file.name);
            const FileIconComponent = fileIconInfo.icon;
            
            return (
              <div
                key={file.id}
                className="notion-file-block group flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                {/* File preview (for images) or type-specific icon */}
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
                    <FileIconComponent size={24} className={fileIconInfo.color} />
                  </div>
                )}

                {/* File info: name and size */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.name}
                  </p>
                  {file.size !== undefined && file.size !== null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatSize(file.size)}
                    </p>
                  )}
                </div>

                {/* Remove button */}
                {onFileRemove && (
                  <button
                    onClick={() => onFileRemove(file.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="Supprimer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Formatting Menu */}
      <FormattingMenu
        show={showFormattingMenu}
        position={menuPosition}
        onFormat={applyFormatting}
        onClose={() => setShowFormattingMenu(false)}
      />

      {/* Slash Menu (Requirements: 18.1-18.6) */}
      {enableSlashCommands && (
        <SlashMenu
          show={showSlashMenu}
          position={slashMenuPosition}
          filter={slashFilter}
          onSelect={handleSlashCommandSelect}
          onClose={closeSlashMenu}
        />
      )}

      {/* Multi-block selection badge - Requirements: 23.4 */}
      {selectedBlocks.size > 0 && (
        <div className="notion-selection-badge">
          <span>{selectedBlocks.size} bloc{selectedBlocks.size > 1 ? 's' : ''} sélectionné{selectedBlocks.size > 1 ? 's' : ''}</span>
          <span className="text-white/60">•</span>
          <span className="text-white/80 text-xs">
            <kbd>⌫</kbd> Supprimer
            <span className="mx-1">•</span>
            <kbd>⌘D</kbd> Dupliquer
            <span className="mx-1">•</span>
            <kbd>Esc</kbd> Annuler
          </span>
        </div>
      )}

      {/* Styles injectés */}
      <style>{notionEditorStyles}</style>
      <style>{dragHandleStyles}</style>
      <style>{blockDragStyles}</style>
    </div>
  );
});

NotionClipboardEditor.displayName = 'NotionClipboardEditor';

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get the appropriate icon component based on file MIME type
 * Requirements: 5.2 - Display file icon based on type
 */
function getFileIcon(mimeType: string): { icon: LucideIcon; color: string } {
  const type = mimeType.toLowerCase();
  
  // Images
  if (type.startsWith('image/')) {
    return { icon: FileImage, color: 'text-pink-500' };
  }
  
  // Videos
  if (type.startsWith('video/')) {
    return { icon: FileVideo, color: 'text-purple-500' };
  }
  
  // Audio
  if (type.startsWith('audio/')) {
    return { icon: FileAudio, color: 'text-orange-500' };
  }
  
  // Documents
  if (type === 'application/pdf') {
    return { icon: FileText, color: 'text-red-500' };
  }
  
  // Word documents
  if (type.includes('word') || type.includes('document') || type === 'application/msword' || 
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return { icon: FileText, color: 'text-blue-500' };
  }
  
  // Spreadsheets
  if (type.includes('spreadsheet') || type.includes('excel') || type === 'text/csv' ||
      type === 'application/vnd.ms-excel' || 
      type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return { icon: FileSpreadsheet, color: 'text-green-500' };
  }
  
  // Presentations
  if (type.includes('presentation') || type.includes('powerpoint') ||
      type === 'application/vnd.ms-powerpoint' ||
      type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return { icon: Presentation, color: 'text-orange-500' };
  }
  
  // Archives
  if (type.includes('zip') || type.includes('rar') || type.includes('tar') || 
      type.includes('gzip') || type.includes('7z') || type.includes('archive') ||
      type === 'application/x-compressed') {
    return { icon: FileArchive, color: 'text-yellow-600' };
  }
  
  // Code files
  if (type.includes('javascript') || type.includes('typescript') || type.includes('json') ||
      type.includes('xml') || type.includes('html') || type.includes('css') ||
      type.includes('python') || type.includes('java') || type.includes('c++') ||
      type === 'text/x-python' || type === 'application/x-python-code' ||
      type === 'text/x-java-source' || type === 'text/x-c') {
    return { icon: FileCode, color: 'text-cyan-500' };
  }
  
  // Plain text
  if (type.startsWith('text/')) {
    return { icon: FileText, color: 'text-gray-500' };
  }
  
  // Default
  return { icon: File, color: 'text-gray-500' };
}

/**
 * Get file icon based on file extension (fallback when MIME type is not available)
 * Requirements: 5.2 - Display file icon based on type
 */
function getFileIconByExtension(filename: string): { icon: LucideIcon; color: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'].includes(ext)) {
    return { icon: FileImage, color: 'text-pink-500' };
  }
  
  // Videos
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) {
    return { icon: FileVideo, color: 'text-purple-500' };
  }
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
    return { icon: FileAudio, color: 'text-orange-500' };
  }
  
  // PDF
  if (ext === 'pdf') {
    return { icon: FileText, color: 'text-red-500' };
  }
  
  // Word documents
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
    return { icon: FileText, color: 'text-blue-500' };
  }
  
  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return { icon: FileSpreadsheet, color: 'text-green-500' };
  }
  
  // Presentations
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) {
    return { icon: Presentation, color: 'text-orange-500' };
  }
  
  // Archives
  if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2'].includes(ext)) {
    return { icon: FileArchive, color: 'text-yellow-600' };
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 
       'rb', 'php', 'swift', 'kt', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml',
       'md', 'sql', 'sh', 'bash'].includes(ext)) {
    return { icon: FileCode, color: 'text-cyan-500' };
  }
  
  // Plain text
  if (['txt', 'log'].includes(ext)) {
    return { icon: FileText, color: 'text-gray-500' };
  }
  
  // Default
  return { icon: File, color: 'text-gray-500' };
}


// ============================================
// STYLES
// ============================================

const notionEditorStyles = `
  .notion-editor:focus {
    outline: none;
  }

  /* Paragraphs - Réduction des espaces */
  .notion-editor p {
    margin: 0;
    padding: 2px 0;
    min-height: 1em;
  }
  .notion-editor p:empty {
    min-height: 1.5em;
  }
  .notion-editor p + p {
    margin-top: 0;
  }

  /* Headings */
  .notion-editor h1 {
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.2;
    margin: 1.5rem 0 0.25rem 0;
    padding: 3px 0;
  }
  .notion-editor h1:first-child {
    margin-top: 0;
  }
  .notion-editor h2 {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.25;
    margin: 1.25rem 0 0.25rem 0;
    padding: 3px 0;
  }
  .notion-editor h2:first-child {
    margin-top: 0;
  }
  .notion-editor h3 {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.3;
    margin: 1rem 0 0.25rem 0;
    padding: 3px 0;
  }
  .notion-editor h3:first-child {
    margin-top: 0;
  }

  /* Lists - Espacement réduit */
  .notion-editor ul, .notion-editor ol {
    margin: 0.125rem 0;
    padding-left: 1.5rem;
  }
  .notion-editor li {
    padding: 1px 0;
    line-height: 1.5;
  }
  .notion-editor li + li {
    margin-top: 0;
  }

  /* Nested lists */
  .notion-editor ul ul, .notion-editor ol ol,
  .notion-editor ul ol, .notion-editor ol ul {
    margin: 0;
  }

  /* To-do / Checkboxes */
  .notion-editor .notion-todo {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 2px 0;
    margin: 1px 0;
  }
  .notion-editor .notion-todo input[type="checkbox"] {
    margin-top: 4px;
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: #2383e2;
  }
  .notion-editor .notion-todo span {
    flex: 1;
    min-height: 1.5em;
  }
  .notion-editor .notion-todo input:checked + span {
    text-decoration: line-through;
    color: #9b9a97;
  }

  /* Callouts */
  .notion-editor .notion-callout {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    margin: 4px 0;
    border-radius: 4px;
    background: rgba(241, 241, 239, 0.6);
  }
  .dark .notion-editor .notion-callout {
    background: rgba(47, 47, 47, 0.6);
  }
  .notion-editor .notion-callout-default {
    background: rgba(241, 241, 239, 0.6);
  }
  .notion-editor .notion-callout-blue {
    background: rgba(219, 237, 255, 0.3);
  }
  .dark .notion-editor .notion-callout-blue {
    background: rgba(11, 107, 203, 0.15);
  }
  .notion-editor .notion-callout-green {
    background: rgba(219, 255, 219, 0.3);
  }
  .dark .notion-editor .notion-callout-green {
    background: rgba(11, 107, 11, 0.15);
  }
  .notion-editor .notion-callout-yellow {
    background: rgba(255, 245, 219, 0.3);
  }
  .dark .notion-editor .notion-callout-yellow {
    background: rgba(203, 107, 11, 0.15);
  }
  .notion-editor .notion-callout-red {
    background: rgba(255, 219, 219, 0.3);
  }
  .dark .notion-editor .notion-callout-red {
    background: rgba(203, 11, 11, 0.15);
  }
  .notion-editor .callout-icon {
    font-size: 20px;
    line-height: 1.5;
    flex-shrink: 0;
  }
  .notion-editor .callout-content {
    flex: 1;
    line-height: 1.5;
    min-height: 1.5em;
  }

  /* Blockquotes - Requirement 19.6: larger text and left border */
  .notion-editor blockquote {
    margin: 4px 0;
    padding: 3px 0 3px 14px;
    border-left: 3px solid #37352f;
    font-size: 1.1em;
    color: #37352f;
  }
  .dark .notion-editor blockquote {
    border-left-color: #e3e3e3;
    color: #e3e3e3;
  }

  /* Code blocks */
  .notion-editor pre {
    background: #f7f6f3;
    padding: 16px;
    border-radius: 4px;
    font-family: "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 14px;
    overflow-x: auto;
    margin: 8px 0;
    line-height: 1.45;
  }
  .dark .notion-editor pre {
    background: #2f2f2f;
  }
  .notion-editor pre code {
    background: none;
    padding: 0;
    color: inherit;
  }

  /* Inline code */
  .notion-editor code {
    background: rgba(135, 131, 120, 0.15);
    color: #eb5757;
    padding: 2px 5px;
    border-radius: 3px;
    font-family: "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 85%;
  }
  .dark .notion-editor code {
    background: rgba(135, 131, 120, 0.25);
    color: #ff6b6b;
  }

  /* Tables */
  .notion-editor table {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
    font-size: 14px;
  }
  .notion-editor table th {
    background: #f7f6f3;
    font-weight: 600;
    padding: 8px 12px;
    text-align: left;
    border: 1px solid #e3e2e0;
  }
  .dark .notion-editor table th {
    background: #2f2f2f;
    border-color: #373737;
  }
  .notion-editor table td {
    padding: 8px 12px;
    border: 1px solid #e3e2e0;
    vertical-align: top;
  }
  .dark .notion-editor table td {
    border-color: #373737;
  }
  .notion-editor table tr:hover td {
    background: rgba(55, 53, 47, 0.03);
  }
  .dark .notion-editor table tr:hover td {
    background: rgba(255, 255, 255, 0.03);
  }

  /* Dividers */
  .notion-editor hr.notion-divider {
    border: none;
    border-top: 1px solid #e3e2e0;
    margin: 12px 0;
  }
  .dark .notion-editor hr.notion-divider {
    border-top-color: #373737;
  }

  /* Images */
  .notion-editor img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 8px 0;
  }
  .notion-editor img.notion-image-inline {
    display: inline-block;
    max-width: 100%;
    max-height: 300px;
    margin: 4px 0;
    vertical-align: middle;
  }

  /* Image blocks */
  .notion-image-block {
    transition: all 0.2s ease;
  }
  .notion-image-block:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* File blocks */
  .notion-file-block {
    transition: all 0.2s ease;
  }
  .notion-file-block:hover {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  }

  /* Links */
  .notion-editor a {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: rgba(55, 53, 47, 0.4);
    text-underline-offset: 2px;
  }
  .dark .notion-editor a {
    text-decoration-color: rgba(227, 227, 227, 0.4);
  }
  .notion-editor a:hover {
    text-decoration-color: rgba(55, 53, 47, 0.8);
  }
  .dark .notion-editor a:hover {
    text-decoration-color: rgba(227, 227, 227, 0.8);
  }

  /* Text formatting */
  .notion-editor strong, .notion-editor b {
    font-weight: 600;
  }
  .notion-editor em, .notion-editor i {
    font-style: italic;
  }
  .notion-editor u {
    text-decoration: underline;
  }
  .notion-editor s, .notion-editor del {
    text-decoration: line-through;
  }

  /* MathJax equations */
  .notion-editor .MathJax {
    font-size: 1em !important;
  }
  .notion-editor .notion-equation {
    background: rgba(241, 241, 239, 0.6);
    padding: 12px 16px;
    margin: 8px 0;
    border-radius: 4px;
    overflow-x: auto;
    display: block;
    text-align: center;
  }
  .dark .notion-editor .notion-equation {
    background: rgba(47, 47, 47, 0.6);
  }
  .notion-editor .notion-equation-inline {
    background: rgba(241, 241, 239, 0.6);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: "KaTeX_Main", "Times New Roman", serif;
  }
  .dark .notion-editor .notion-equation-inline {
    background: rgba(47, 47, 47, 0.6);
  }

  /* Toggle lists */
  .notion-editor details.notion-toggle {
    margin: 2px 0;
  }
  .notion-editor details.notion-toggle summary {
    cursor: pointer;
    list-style: none;
    padding-left: 24px;
    position: relative;
    user-select: none;
  }
  .notion-editor details.notion-toggle summary::-webkit-details-marker {
    display: none;
  }
  .notion-editor details.notion-toggle summary::before {
    content: '▶';
    position: absolute;
    left: 0;
    font-size: 10px;
    transition: transform 0.2s;
    color: #9b9a97;
  }
  .notion-editor details.notion-toggle[open] summary::before {
    transform: rotate(90deg);
  }
  .notion-editor details.notion-toggle > div {
    padding-left: 24px;
    margin-top: 4px;
  }

  /* Bookmarks / Embeds */
  .notion-editor .notion-bookmark {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    margin: 8px 0;
    border-radius: 4px;
    border: 1px solid #e3e2e0;
    background: #f7f6f3;
    text-decoration: none;
    color: inherit;
  }
  .dark .notion-editor .notion-bookmark {
    border-color: #373737;
    background: #2f2f2f;
  }
  .notion-editor .notion-bookmark:hover {
    background: #f0efed;
  }
  .dark .notion-editor .notion-bookmark:hover {
    background: #3a3a3a;
  }

  /* Page links - link to sub-pages (Requirement 19.2) */
  .notion-editor .notion-page-link {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    margin: 2px 0;
    border-radius: 4px;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .notion-editor .notion-page-link:hover {
    background: rgba(55, 53, 47, 0.08);
  }
  .dark .notion-editor .notion-page-link:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  /* Video blocks - Requirement 20.2 */
  .notion-editor .notion-video-block {
    margin: 12px 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e3e2e0;
    background: #f7f6f3;
    cursor: pointer;
    transition: box-shadow 0.2s ease;
  }
  .dark .notion-editor .notion-video-block {
    border-color: #373737;
    background: #2f2f2f;
  }
  .notion-editor .notion-video-block:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  .notion-editor .notion-video-preview {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .notion-editor .notion-video-thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .notion-editor .notion-vimeo-preview {
    background: linear-gradient(135deg, #1ab7ea 0%, #0077b5 100%);
  }
  .notion-editor .notion-video-play-button {
    position: absolute;
    width: 60px;
    height: 60px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
    transition: transform 0.2s ease, background 0.2s ease;
  }
  .notion-editor .notion-video-block:hover .notion-video-play-button {
    transform: scale(1.1);
    background: rgba(0, 0, 0, 0.85);
  }
  .notion-editor .notion-video-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    font-size: 14px;
    color: #37352f;
  }
  .dark .notion-editor .notion-video-info {
    color: #e3e3e3;
  }
  .notion-editor .notion-video-icon {
    font-size: 16px;
  }
  .notion-editor .notion-video-label {
    font-weight: 500;
  }

  /* Audio blocks - Requirement 20.3 */
  .notion-editor .notion-audio-block {
    margin: 12px 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e3e2e0;
    background: #f7f6f3;
  }
  .dark .notion-editor .notion-audio-block {
    border-color: #373737;
    background: #2f2f2f;
  }
  .notion-editor .notion-audio-player {
    width: 100%;
  }
  .notion-editor .notion-spotify-player iframe {
    border-radius: 8px;
  }
  .notion-editor .notion-audio-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
  }
  .notion-editor .notion-audio-icon {
    font-size: 24px;
  }
  .notion-editor .notion-audio-label {
    flex: 1;
    font-weight: 500;
    color: #37352f;
  }
  .dark .notion-editor .notion-audio-label {
    color: #e3e3e3;
  }
  .notion-editor .notion-audio-link {
    padding: 6px 12px;
    background: #ff5500;
    color: white;
    border-radius: 4px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.2s ease;
  }
  .notion-editor .notion-audio-link:hover {
    background: #ff7700;
  }

  /* Enhanced bookmark blocks - Requirement 20.6 */
  .notion-editor .notion-bookmark-block {
    margin: 12px 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e3e2e0;
    background: #f7f6f3;
    transition: box-shadow 0.2s ease;
  }
  .dark .notion-editor .notion-bookmark-block {
    border-color: #373737;
    background: #2f2f2f;
  }
  .notion-editor .notion-bookmark-block:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  .notion-editor .notion-bookmark-link {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    text-decoration: none;
    color: inherit;
    gap: 12px;
  }
  .notion-editor .notion-bookmark-content {
    flex: 1;
    min-width: 0;
  }
  .notion-editor .notion-bookmark-title {
    font-weight: 600;
    font-size: 14px;
    color: #37352f;
    margin-bottom: 4px;
  }
  .dark .notion-editor .notion-bookmark-title {
    color: #e3e3e3;
  }
  .notion-editor .notion-bookmark-description {
    font-size: 12px;
    color: #9b9a97;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .notion-editor .notion-bookmark-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  /* Code blocks with language selector - Requirement 20.5 */
  .notion-editor pre[data-language] {
    position: relative;
  }
  .notion-editor pre[data-language]::before {
    content: attr(data-language);
    position: absolute;
    top: 8px;
    right: 12px;
    font-size: 11px;
    font-weight: 500;
    color: #9b9a97;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(255, 255, 255, 0.8);
    padding: 2px 8px;
    border-radius: 4px;
  }
  .dark .notion-editor pre[data-language]::before {
    background: rgba(0, 0, 0, 0.4);
    color: #a0a0a0;
  }

  /* Image blocks with resize controls - Requirement 20.1 */
  .notion-editor .notion-image {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 8px 0;
    cursor: pointer;
    transition: box-shadow 0.2s ease;
  }
  .notion-editor .notion-image:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
  .notion-editor .notion-image-wrapper {
    position: relative;
    display: inline-block;
    max-width: 100%;
  }
  .notion-editor .notion-image-controls {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .notion-editor .notion-image-wrapper:hover .notion-image-controls {
    opacity: 1;
  }
  .notion-editor .notion-image-control-btn {
    width: 28px;
    height: 28px;
    background: rgba(0, 0, 0, 0.6);
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: background 0.2s ease;
  }
  .notion-editor .notion-image-control-btn:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  /* Embed blocks - Requirements 21.1-21.6 */
  .notion-editor .notion-embed-block {
    margin: 12px 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e3e2e0;
    background: #f7f6f3;
    transition: box-shadow 0.2s ease;
  }
  .dark .notion-editor .notion-embed-block {
    border-color: #373737;
    background: #2f2f2f;
  }
  .notion-editor .notion-embed-block:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  .notion-editor .notion-embed-container {
    width: 100%;
    background: #fff;
  }
  .dark .notion-editor .notion-embed-container {
    background: #1a1a1a;
  }
  .notion-editor .notion-embed-container iframe {
    display: block;
    border: none;
  }
  .notion-editor .notion-embed-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    font-size: 14px;
    color: #37352f;
    border-top: 1px solid #e3e2e0;
  }
  .dark .notion-editor .notion-embed-info {
    color: #e3e3e3;
    border-top-color: #373737;
  }
  .notion-editor .notion-embed-icon {
    font-size: 16px;
    flex-shrink: 0;
  }
  .notion-editor .notion-embed-label {
    font-weight: 500;
    flex: 1;
  }
  .notion-editor .notion-embed-link {
    padding: 4px 10px;
    background: rgba(55, 53, 47, 0.08);
    color: #37352f;
    border-radius: 4px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    transition: background 0.2s ease;
  }
  .dark .notion-editor .notion-embed-link {
    background: rgba(255, 255, 255, 0.08);
    color: #e3e3e3;
  }
  .notion-editor .notion-embed-link:hover {
    background: rgba(55, 53, 47, 0.16);
  }
  .dark .notion-editor .notion-embed-link:hover {
    background: rgba(255, 255, 255, 0.16);
  }

  /* Google Drive embed - Requirement 21.1 */
  .notion-editor .notion-google-drive-embed .notion-embed-container {
    min-height: 400px;
  }

  /* Figma embed - Requirement 21.2 */
  .notion-editor .notion-figma-embed .notion-embed-container {
    min-height: 450px;
    background: #1e1e1e;
  }
  .notion-editor .notion-figma-embed .notion-embed-info {
    background: linear-gradient(135deg, #f24e1e 0%, #a259ff 50%, #1abcfe 100%);
    background-size: 200% 200%;
    color: white;
    border-top: none;
  }
  .notion-editor .notion-figma-embed .notion-embed-link {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
  .notion-editor .notion-figma-embed .notion-embed-link:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* PDF embed - Requirement 21.3 */
  .notion-editor .notion-pdf-embed .notion-embed-container {
    min-height: 500px;
  }
  .notion-editor .notion-pdf-embed .notion-embed-info {
    background: #dc2626;
    color: white;
    border-top: none;
  }
  .notion-editor .notion-pdf-embed .notion-embed-link {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
  .notion-editor .notion-pdf-embed .notion-embed-link:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Loom embed - Requirement 21.4 */
  .notion-editor .notion-loom-embed .notion-embed-container {
    min-height: 400px;
    aspect-ratio: 16 / 9;
  }
  .notion-editor .notion-loom-embed .notion-embed-info {
    background: #625df5;
    color: white;
    border-top: none;
  }
  .notion-editor .notion-loom-embed .notion-embed-link {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
  .notion-editor .notion-loom-embed .notion-embed-link:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* GitHub Gist embed - Requirement 21.5 */
  .notion-editor .notion-gist-embed .notion-embed-container {
    padding: 0;
    overflow: auto;
    max-height: 400px;
  }
  .notion-editor .notion-gist-embed .notion-embed-container .gist {
    margin: 0;
  }
  .notion-editor .notion-gist-embed .notion-embed-container .gist .gist-file {
    margin-bottom: 0;
    border: none;
  }
  .notion-editor .notion-gist-embed .notion-embed-info {
    background: #24292e;
    color: white;
    border-top: none;
  }
  .notion-editor .notion-gist-embed .notion-embed-link {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }
  .notion-editor .notion-gist-embed .notion-embed-link:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  /* Google Maps embed - Requirement 21.6 */
  .notion-editor .notion-maps-embed .notion-embed-container {
    min-height: 350px;
  }
  .notion-editor .notion-maps-embed .notion-embed-info {
    background: #4285f4;
    color: white;
    border-top: none;
  }
  .notion-editor .notion-maps-embed .notion-embed-link {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
  .notion-editor .notion-maps-embed .notion-embed-link:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  .notion-editor .notion-maps-preview {
    cursor: pointer;
  }
  .notion-editor .notion-maps-link {
    display: block;
    text-decoration: none;
  }
  .notion-editor .notion-maps-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    background: linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc05 100%);
    color: white;
    gap: 12px;
  }
  .notion-editor .notion-maps-icon {
    font-size: 48px;
  }
  .notion-editor .notion-maps-text {
    font-size: 16px;
    font-weight: 500;
  }
`;

// Block drag and drop styles - Requirements: 22.1-22.8
const blockDragStyles = `
  /* Editor container for drag handle positioning */
  .notion-editor-container {
    position: relative;
  }

  /* Drag handle wrapper positioning */
  .drag-handle-wrapper {
    position: absolute;
    z-index: 50;
  }

  /* Block being dragged */
  .dragging-block {
    opacity: 0.4;
    background: rgba(55, 53, 47, 0.03);
    border-radius: 4px;
  }

  .dark .dragging-block {
    background: rgba(255, 255, 255, 0.03);
  }

  /* Drop indicator line */
  .drop-indicator-line {
    position: absolute;
    left: 32px;
    right: 0;
    height: 3px;
    background: #2383e2;
    border-radius: 2px;
    z-index: 40;
    pointer-events: none;
    animation: dropIndicatorPulse 1s ease infinite;
  }

  .drop-indicator-line::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    background: #2383e2;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .dark .drop-indicator-line::before {
    border-color: #2f2f2f;
  }

  @keyframes dropIndicatorPulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  /* Hover highlight for blocks */
  .notion-editor p:hover,
  .notion-editor h1:hover,
  .notion-editor h2:hover,
  .notion-editor h3:hover,
  .notion-editor ul:hover,
  .notion-editor ol:hover,
  .notion-editor blockquote:hover,
  .notion-editor pre:hover,
  .notion-editor details:hover,
  .notion-editor .notion-todo:hover,
  .notion-editor .notion-callout:hover,
  .notion-editor table:hover {
    background: rgba(55, 53, 47, 0.02);
    border-radius: 4px;
  }

  .dark .notion-editor p:hover,
  .dark .notion-editor h1:hover,
  .dark .notion-editor h2:hover,
  .dark .notion-editor h3:hover,
  .dark .notion-editor ul:hover,
  .dark .notion-editor ol:hover,
  .dark .notion-editor blockquote:hover,
  .dark .notion-editor pre:hover,
  .dark .notion-editor details:hover,
  .dark .notion-editor .notion-todo:hover,
  .dark .notion-editor .notion-callout:hover,
  .dark .notion-editor table:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  /* Multi-block selection styles - Requirements: 23.1-23.4 */
  .notion-block-selected {
    background: rgba(35, 131, 226, 0.14) !important;
    border-radius: 4px;
    outline: 2px solid rgba(35, 131, 226, 0.6);
    outline-offset: -1px;
    position: relative;
  }

  .dark .notion-block-selected {
    background: rgba(35, 131, 226, 0.2) !important;
    outline-color: rgba(35, 131, 226, 0.7);
  }

  /* Selection indicator on left margin */
  .notion-block-selected::before {
    content: '';
    position: absolute;
    left: -24px;
    top: 0;
    bottom: 0;
    width: 3px;
    background: #2383e2;
    border-radius: 2px;
  }

  /* Margin drag cursor */
  .notion-editor-container {
    cursor: default;
  }

  /* Left margin area for drag selection */
  .notion-editor {
    position: relative;
  }

  /* Visual feedback during margin drag */
  .notion-editor-container.margin-dragging {
    cursor: crosshair;
    user-select: none;
  }

  /* Selected block animation */
  @keyframes blockSelectPulse {
    0% {
      outline-color: rgba(35, 131, 226, 0.6);
    }
    50% {
      outline-color: rgba(35, 131, 226, 0.3);
    }
    100% {
      outline-color: rgba(35, 131, 226, 0.6);
    }
  }

  .notion-block-selected {
    animation: blockSelectPulse 2s ease-in-out infinite;
  }

  /* Multi-selection count badge (optional visual) */
  .notion-selection-badge {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #2383e2;
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .notion-selection-badge kbd {
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
  }
`;


// ============================================
// CONVERSION HELPERS
// ============================================

function contentToHtml(content: string): string {
  if (!content) return '';
  
  // Detect if content is HTML or markdown
  if (content.trim().startsWith('<') && content.includes('</')) {
    return content; // Already HTML
  }

  return markdownToHtml(content);
}

function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  const htmlLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLanguage = '';
  let inTable = false;
  let tableRows: string[] = [];
  let consecutiveEmptyLines = 0;
  let inBlockEquation = false;
  let blockEquationContent = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLanguage = line.substring(3).trim();
        codeBlockContent = '';
        continue;
      } else {
        inCodeBlock = false;
        const langAttr = codeBlockLanguage ? ` data-language="${escapeHtml(codeBlockLanguage)}"` : '';
        const langClass = codeBlockLanguage ? ` class="language-${escapeHtml(codeBlockLanguage)}"` : '';
        htmlLines.push(`<pre${langAttr}><code${langClass}>${escapeHtml(codeBlockContent)}</code></pre>`);
        codeBlockContent = '';
        codeBlockLanguage = '';
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockContent += (codeBlockContent ? '\n' : '') + line;
      continue;
    }

    // Handle block equations ($$...$$)
    if (line.trim() === '$$') {
      if (!inBlockEquation) {
        inBlockEquation = true;
        blockEquationContent = '';
        continue;
      } else {
        inBlockEquation = false;
        htmlLines.push(`<div class="notion-equation">$$${escapeHtml(blockEquationContent)}$$</div>`);
        blockEquationContent = '';
        continue;
      }
    }

    if (inBlockEquation) {
      blockEquationContent += (blockEquationContent ? '\n' : '') + line;
      continue;
    }

    // Handle tables (markdown format)
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
      continue;
    } else if (inTable) {
      htmlLines.push(convertTableToHtml(tableRows));
      tableRows = [];
      inTable = false;
    }

    // Handle empty lines - limit consecutive empty lines
    if (line.trim() === '') {
      consecutiveEmptyLines++;
      if (consecutiveEmptyLines <= 1) {
        htmlLines.push('<p><br></p>');
      }
      continue;
    }
    consecutiveEmptyLines = 0;

    // Process inline markdown first
    line = processInlineMarkdown(line);

    // Block types
    if (line.startsWith('### ')) {
      htmlLines.push(`<h3>${line.substring(4)}</h3>`);
    } else if (line.startsWith('## ')) {
      htmlLines.push(`<h2>${line.substring(3)}</h2>`);
    } else if (line.startsWith('# ')) {
      htmlLines.push(`<h1>${line.substring(2)}</h1>`);
    } else if (line.startsWith('> [!')) {
      // Callout blocks
      const calloutMatch = line.match(/^> \[!(note|info|tip|warning|danger|success|default)\]\s*(.*)$/i);
      if (calloutMatch) {
        const [, type, content] = calloutMatch;
        const icon = getCalloutIcon(type.toLowerCase());
        const colorClass = getCalloutColorClass(type.toLowerCase());
        htmlLines.push(`<div class="notion-callout ${colorClass}"><span class="callout-icon">${icon}</span><div class="callout-content">${content}</div></div>`);
      } else {
        // Regular blockquote starting with > [!
        htmlLines.push(`<blockquote>${line.substring(2)}</blockquote>`);
      }
    } else if (line.startsWith('>> ')) {
      // Quote block (double >)
      const content = processInlineMarkdown(line.substring(3));
      htmlLines.push(`<blockquote>${content}</blockquote>`);
    } else if (line.startsWith('> ')) {
      // Toggle list (single >)
      const content = processInlineMarkdown(line.substring(2));
      htmlLines.push(`<details class="notion-toggle"><summary>${content}</summary><div></div></details>`);
    } else if (line.match(/^- \[[ xX]\]/)) {
      // Checkbox
      const checked = line.toLowerCase().includes('[x]');
      const content = line.replace(/^- \[[ xX]\]\s*/, '');
      htmlLines.push(`<div class="notion-todo"><input type="checkbox" ${checked ? 'checked' : ''}><span>${content}</span></div>`);
    } else if (line.match(/^\d+\.\s/)) {
      // Numbered list
      const content = line.replace(/^\d+\.\s*/, '');
      htmlLines.push(`<li class="notion-numbered-list">${content}</li>`);
    } else if (line.match(/^[-*+]\s/)) {
      // Bullet list
      const content = line.substring(2);
      htmlLines.push(`<li class="notion-bullet-list">${content}</li>`);
    } else if (line === '---' || line === '___' || line === '***') {
      // Divider
      htmlLines.push('<hr class="notion-divider">');
    } else if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
      // Single-line block equation ($$...$$)
      const equation = line.substring(2, line.length - 2);
      htmlLines.push(`<div class="notion-equation">$$${escapeHtml(equation)}$$</div>`);
    } else if (line.match(/^!\[.*?\]\(.*?\)$/)) {
      // Image - markdown syntax
      const match = line.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const [, alt, src] = match;
        htmlLines.push(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="notion-image">`);
      }
    } else if (line.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
      // Direct image URL
      htmlLines.push(`<img src="${escapeHtml(line)}" alt="Image" class="notion-image">`);
    } else if (isYouTubeUrl(line)) {
      // Video embed - YouTube (Requirement 20.2)
      const videoId = extractYouTubeId(line);
      if (videoId) {
        htmlLines.push(`<div class="notion-video-block" data-video-type="youtube" data-video-id="${escapeHtml(videoId)}">
          <div class="notion-video-preview">
            <img src="https://img.youtube.com/vi/${escapeHtml(videoId)}/maxresdefault.jpg" alt="YouTube Video" class="notion-video-thumbnail" onerror="this.src='https://img.youtube.com/vi/${escapeHtml(videoId)}/hqdefault.jpg'">
            <div class="notion-video-play-button">▶</div>
          </div>
          <div class="notion-video-info">
            <span class="notion-video-icon">📺</span>
            <span class="notion-video-label">YouTube Video</span>
          </div>
        </div>`);
      } else {
        htmlLines.push(`<a href="${escapeHtml(line)}" class="notion-bookmark" target="_blank">🔗 ${escapeHtml(line)}</a>`);
      }
    } else if (isVimeoUrl(line)) {
      // Video embed - Vimeo (Requirement 20.2)
      const videoId = extractVimeoId(line);
      if (videoId) {
        htmlLines.push(`<div class="notion-video-block" data-video-type="vimeo" data-video-id="${escapeHtml(videoId)}">
          <div class="notion-video-preview notion-vimeo-preview">
            <div class="notion-video-play-button">▶</div>
          </div>
          <div class="notion-video-info">
            <span class="notion-video-icon">🎬</span>
            <span class="notion-video-label">Vimeo Video</span>
          </div>
        </div>`);
      } else {
        htmlLines.push(`<a href="${escapeHtml(line)}" class="notion-bookmark" target="_blank">🔗 ${escapeHtml(line)}</a>`);
      }
    } else if (isSpotifyUrl(line)) {
      // Audio embed - Spotify (Requirement 20.3)
      const spotifyData = extractSpotifyData(line);
      if (spotifyData) {
        htmlLines.push(`<div class="notion-audio-block" data-audio-type="spotify" data-spotify-type="${escapeHtml(spotifyData.type)}" data-spotify-id="${escapeHtml(spotifyData.id)}">
          <div class="notion-audio-player notion-spotify-player">
            <iframe src="https://open.spotify.com/embed/${escapeHtml(spotifyData.type)}/${escapeHtml(spotifyData.id)}" width="100%" height="152" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
          </div>
        </div>`);
      } else {
        htmlLines.push(`<a href="${escapeHtml(line)}" class="notion-bookmark" target="_blank">🔗 ${escapeHtml(line)}</a>`);
      }
    } else if (isSoundCloudUrl(line)) {
      // Audio embed - SoundCloud (Requirement 20.3)
      htmlLines.push(`<div class="notion-audio-block" data-audio-type="soundcloud" data-url="${escapeHtml(line)}">
        <div class="notion-audio-preview">
          <span class="notion-audio-icon">🎵</span>
          <span class="notion-audio-label">SoundCloud Audio</span>
          <a href="${escapeHtml(line)}" target="_blank" class="notion-audio-link">Open in SoundCloud</a>
        </div>
      </div>`);
    } else if (isGoogleDriveUrl(line)) {
      // Google Drive embed (Requirement 21.1)
      const driveData = extractGoogleDriveData(line);
      if (driveData) {
        const embedUrl = driveData.type === 'file' 
          ? `https://drive.google.com/file/d/${escapeHtml(driveData.fileId)}/preview`
          : driveData.type === 'document'
          ? `https://docs.google.com/document/d/${escapeHtml(driveData.fileId)}/preview`
          : driveData.type === 'spreadsheet'
          ? `https://docs.google.com/spreadsheets/d/${escapeHtml(driveData.fileId)}/preview`
          : driveData.type === 'presentation'
          ? `https://docs.google.com/presentation/d/${escapeHtml(driveData.fileId)}/preview`
          : `https://docs.google.com/forms/d/${escapeHtml(driveData.fileId)}/viewform?embedded=true`;
        
        const typeIcon = driveData.type === 'document' ? '📄' 
          : driveData.type === 'spreadsheet' ? '📊'
          : driveData.type === 'presentation' ? '📽️'
          : driveData.type === 'form' ? '📝'
          : '📁';
        const typeLabel = driveData.type === 'document' ? 'Google Docs'
          : driveData.type === 'spreadsheet' ? 'Google Sheets'
          : driveData.type === 'presentation' ? 'Google Slides'
          : driveData.type === 'form' ? 'Google Forms'
          : 'Google Drive';
        
        htmlLines.push(`<div class="notion-embed-block notion-google-drive-embed" data-embed-type="google-drive" data-drive-type="${escapeHtml(driveData.type)}" data-file-id="${escapeHtml(driveData.fileId)}" data-url="${escapeHtml(line)}">
          <div class="notion-embed-container">
            <iframe src="${embedUrl}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>
          </div>
          <div class="notion-embed-info">
            <span class="notion-embed-icon">${typeIcon}</span>
            <span class="notion-embed-label">${typeLabel}</span>
            <a href="${escapeHtml(line)}" target="_blank" class="notion-embed-link">Open</a>
          </div>
        </div>`);
      } else {
        htmlLines.push(`<a href="${escapeHtml(line)}" class="notion-bookmark" target="_blank">📁 ${escapeHtml(line)}</a>`);
      }
    } else if (isFigmaUrl(line)) {
      // Figma embed (Requirement 21.2)
      const figmaKey = extractFigmaKey(line);
      if (figmaKey) {
        const embedUrl = `https://www.figma.com/embed?embed_host=notion&url=${encodeURIComponent(line)}`;
        htmlLines.push(`<div class="notion-embed-block notion-figma-embed" data-embed-type="figma" data-figma-key="${escapeHtml(figmaKey)}" data-url="${escapeHtml(line)}">
          <div class="notion-embed-container notion-figma-container">
            <iframe src="${embedUrl}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>
          </div>
          <div class="notion-embed-info">
            <span class="notion-embed-icon">🎨</span>
            <span class="notion-embed-label">Figma</span>
            <a href="${escapeHtml(line)}" target="_blank" class="notion-embed-link">Open in Figma</a>
          </div>
        </div>`);
      } else {
        htmlLines.push(`<a href="${escapeHtml(line)}" class="notion-bookmark" target="_blank">🎨 ${escapeHtml(line)}</a>`);
      }
    } else if (isPdfUrl(line)) {
      // PDF embed (Requirement 21.3)
      htmlLines.push(`<div class="notion-embed-block notion-pdf-embed" data-embed-type="pdf" data-url="${escapeHtml(line)}">
        <div class="notion-embed-container notion-pdf-container">
          <iframe src="${escapeHtml(line)}" width="100%" height="500" frameborder="0"></iframe>
        </div>
        <div class="notion-embed-info">
          <span class="notion-embed-icon">📕</span>
          <span class="notion-embed-label">PDF Document</span>
          <a href="${escapeHtml(line)}" target="_blank" class="notion-embed-link">Download</a>
        </div>
      </div>`);
    } else if (isLoomUrl(line)) {
      // Loom embed (Requirement 21.4)
      const loomId = extractLoomId(line);
      if (loomId) {
        const embedUrl = `https://www.loom.com/embed/${escapeHtml(loomId)}`;
        htmlLines.push(`<div class="notion-embed-block notion-loom-embed" data-embed-type="loom" data-loom-id="${escapeHtml(loomId)}" data-url="${escapeHtml(line)}">
          <div class="notion-embed-container notion-loom-container">
            <iframe src="${embedUrl}" width="100%" height="400" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
          </div>
          <div class="notion-embed-info">
            <span class="notion-embed-icon">🎥</span>
            <span class="notion-embed-label">Loom Video</span>
            <a href="${escapeHtml(line)}" target="_blank" class="notion-embed-link">Open in Loom</a>
          </div>
        </div>`);
      } else {
        htmlLines.push(`<a href="${escapeHtml(line)}" class="notion-bookmark" target="_blank">🎥 ${escapeHtml(line)}</a>`);
      }
    } else if (isGitHubGistUrl(line)) {
      // GitHub Gist embed (Requirement 21.5)
      const gistData = extractGistId(line);
      if (gistData) {
        htmlLines.push(`<div class="notion-embed-block notion-gist-embed" data-embed-type="gist" data-gist-user="${escapeHtml(gistData.user)}" data-gist-id="${escapeHtml(gistData.gistId)}" data-url="${escapeHtml(line)}">
          <div class="notion-embed-container notion-gist-container">
            <script src="https://gist.github.com/${escapeHtml(gistData.user)}/${escapeHtml(gistData.gistId)}.js"></script>
          </div>
          <div class="notion-embed-info">
            <span class="notion-embed-icon">💻</span>
            <span class="notion-embed-label">GitHub Gist</span>
            <a href="${escapeHtml(line)}" target="_blank" class="notion-embed-link">View on GitHub</a>
          </div>
        </div>`);
      } else {
        htmlLines.push(`<a href="${escapeHtml(line)}" class="notion-bookmark" target="_blank">💻 ${escapeHtml(line)}</a>`);
      }
    } else if (isGoogleMapsUrl(line)) {
      // Google Maps embed (Requirement 21.6)
      const embedUrl = extractGoogleMapsEmbedUrl(line);
      if (embedUrl) {
        htmlLines.push(`<div class="notion-embed-block notion-maps-embed" data-embed-type="google-maps" data-url="${escapeHtml(line)}">
          <div class="notion-embed-container notion-maps-container">
            <iframe src="${embedUrl}" width="100%" height="350" frameborder="0" style="border:0" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
          <div class="notion-embed-info">
            <span class="notion-embed-icon">🗺️</span>
            <span class="notion-embed-label">Google Maps</span>
            <a href="${escapeHtml(line)}" target="_blank" class="notion-embed-link">Open in Maps</a>
          </div>
        </div>`);
      } else {
        // Fallback: show as a clickable map preview
        htmlLines.push(`<div class="notion-embed-block notion-maps-embed notion-maps-preview" data-embed-type="google-maps" data-url="${escapeHtml(line)}">
          <a href="${escapeHtml(line)}" target="_blank" class="notion-maps-link">
            <div class="notion-maps-placeholder">
              <span class="notion-maps-icon">🗺️</span>
              <span class="notion-maps-text">View on Google Maps</span>
            </div>
          </a>
        </div>`);
      }
    } else if (line.match(/^https?:\/\//)) {
      // Bookmark/Link with enhanced preview (Requirement 20.6)
      const domain = extractDomain(line);
      htmlLines.push(`<div class="notion-bookmark-block">
        <a href="${escapeHtml(line)}" class="notion-bookmark-link" target="_blank">
          <div class="notion-bookmark-content">
            <div class="notion-bookmark-title">${escapeHtml(domain)}</div>
            <div class="notion-bookmark-description">${escapeHtml(line)}</div>
          </div>
          <div class="notion-bookmark-icon">🔗</div>
        </a>
      </div>`);
    } else if (line.match(/^\[\[(.+?)\]\]$/)) {
      // Page block - link to sub-page (Requirement 19.2)
      // Syntax: [[Page Title]] or [[Page Title|page-id]]
      const pageMatch = line.match(/^\[\[(.+?)(?:\|(.+?))?\]\]$/);
      if (pageMatch) {
        const [, pageTitle, pageId] = pageMatch;
        const href = pageId ? `#page-${escapeHtml(pageId)}` : '#';
        htmlLines.push(`<a href="${href}" class="notion-page-link" data-page-id="${escapeHtml(pageId || '')}">📄 ${escapeHtml(pageTitle)}</a>`);
      } else {
        htmlLines.push(`<p>${line}</p>`);
      }
    } else {
      htmlLines.push(`<p>${line}</p>`);
    }
  }

  // Close any remaining table
  if (inTable && tableRows.length > 0) {
    htmlLines.push(convertTableToHtml(tableRows));
  }

  let result = htmlLines.join('\n');
  
  // Wrap consecutive list items
  result = result.replace(/(<li class="notion-numbered-list">.*?<\/li>\n?)+/g, (match) => `<ol>${match}</ol>`);
  result = result.replace(/(<li class="notion-bullet-list">.*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Clean up excessive whitespace in result
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // Limit consecutive empty paragraph elements to maximum of 1
  result = result.replace(/(<p><br><\/p>\n?){2,}/g, '<p><br></p>\n');

  return result;
}

function processInlineMarkdown(text: string): string {
  // Don't escape HTML if it's already processed
  if (text.includes('<') && text.includes('>')) {
    return text;
  }

  return text
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold & Italic combinations
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Underline (using __)
    .replace(/__(.+?)__/g, '<u>$1</u>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    // Inline code (before links to avoid conflicts)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Inline equations (single $...$)
    .replace(/\$([^$\n]+)\$/g, '<span class="notion-equation-inline">$$$1$$</span>')
    // Inline images ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="notion-image-inline">')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}

function getCalloutIcon(type: string): string {
  const icons: Record<string, string> = {
    note: '📝',
    info: 'ℹ️',
    tip: '💡',
    warning: '⚠️',
    danger: '🚨',
    success: '✅',
    default: '💡'
  };
  return icons[type] || '💡';
}

function getCalloutColorClass(type: string): string {
  const colors: Record<string, string> = {
    note: 'notion-callout-blue',
    info: 'notion-callout-blue',
    tip: 'notion-callout-green',
    warning: 'notion-callout-yellow',
    danger: 'notion-callout-red',
    success: 'notion-callout-green',
    default: 'notion-callout-default'
  };
  return colors[type] || 'notion-callout-default';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Check if URL is a YouTube video URL
 * Requirement 20.2 - Video URL detection
 */
function isYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)/.test(url);
}

/**
 * Extract YouTube video ID from URL
 * Requirement 20.2 - Video URL parsing
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Check if URL is a Vimeo video URL
 * Requirement 20.2 - Video URL detection
 */
function isVimeoUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?vimeo\.com\/\d+/.test(url);
}

/**
 * Extract Vimeo video ID from URL
 * Requirement 20.2 - Video URL parsing
 */
function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Check if URL is a Spotify URL
 * Requirement 20.3 - Audio URL detection
 */
function isSpotifyUrl(url: string): boolean {
  return /^https?:\/\/(open\.)?spotify\.com\/(track|album|playlist|artist|episode|show)\//.test(url);
}

/**
 * Extract Spotify type and ID from URL
 * Requirement 20.3 - Audio URL parsing
 */
function extractSpotifyData(url: string): { type: string; id: string } | null {
  const match = url.match(/spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/);
  if (match) {
    return { type: match[1], id: match[2] };
  }
  return null;
}

/**
 * Check if URL is a SoundCloud URL
 * Requirement 20.3 - Audio URL detection
 */
function isSoundCloudUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?soundcloud\.com\//.test(url);
}

// ============================================
// EMBED URL DETECTION FUNCTIONS
// Requirements 21.1-21.6 - Embed support
// ============================================

/**
 * Check if URL is a Google Drive URL
 * Requirement 21.1 - Google Drive embed
 */
function isGoogleDriveUrl(url: string): boolean {
  return /^https?:\/\/(drive\.google\.com|docs\.google\.com)\/(file|document|spreadsheets|presentation|forms)/.test(url);
}

/**
 * Extract Google Drive file ID and type from URL
 * Requirement 21.1 - Google Drive embed
 */
function extractGoogleDriveData(url: string): { fileId: string; type: string } | null {
  // Handle drive.google.com/file/d/{fileId}/view
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return { fileId: fileMatch[1], type: 'file' };
  }
  
  // Handle docs.google.com/document/d/{fileId}
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    return { fileId: docMatch[1], type: 'document' };
  }
  
  // Handle docs.google.com/spreadsheets/d/{fileId}
  const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) {
    return { fileId: sheetMatch[1], type: 'spreadsheet' };
  }
  
  // Handle docs.google.com/presentation/d/{fileId}
  const slideMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch) {
    return { fileId: slideMatch[1], type: 'presentation' };
  }
  
  // Handle docs.google.com/forms/d/{fileId}
  const formMatch = url.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (formMatch) {
    return { fileId: formMatch[1], type: 'form' };
  }
  
  return null;
}

/**
 * Check if URL is a Figma URL
 * Requirement 21.2 - Figma embed
 */
function isFigmaUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?figma\.com\/(file|proto|design)\//.test(url);
}

/**
 * Extract Figma file key from URL
 * Requirement 21.2 - Figma embed
 */
function extractFigmaKey(url: string): string | null {
  const match = url.match(/figma\.com\/(file|proto|design)\/([a-zA-Z0-9]+)/);
  return match ? match[2] : null;
}

/**
 * Check if URL is a PDF URL
 * Requirement 21.3 - PDF embed
 */
function isPdfUrl(url: string): boolean {
  return /\.pdf(\?.*)?$/i.test(url) || /^https?:\/\/.*\/.*\.pdf/i.test(url);
}

/**
 * Check if URL is a Loom URL
 * Requirement 21.4 - Loom embed
 */
function isLoomUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?loom\.com\/(share|embed)\//.test(url);
}

/**
 * Extract Loom video ID from URL
 * Requirement 21.4 - Loom embed
 */
function extractLoomId(url: string): string | null {
  const match = url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/);
  return match ? match[2] : null;
}

/**
 * Check if URL is a GitHub Gist URL
 * Requirement 21.5 - GitHub Gist embed
 */
function isGitHubGistUrl(url: string): boolean {
  return /^https?:\/\/gist\.github\.com\//.test(url);
}

/**
 * Extract GitHub Gist ID from URL
 * Requirement 21.5 - GitHub Gist embed
 */
function extractGistId(url: string): { user: string; gistId: string } | null {
  const match = url.match(/gist\.github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9]+)/);
  if (match) {
    return { user: match[1], gistId: match[2] };
  }
  return null;
}

/**
 * Check if URL is a Google Maps URL
 * Requirement 21.6 - Google Maps embed
 */
function isGoogleMapsUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps)/.test(url);
}

/**
 * Extract Google Maps embed URL
 * Requirement 21.6 - Google Maps embed
 */
function extractGoogleMapsEmbedUrl(url: string): string | null {
  // Handle google.com/maps/place/... URLs
  if (url.includes('google.com/maps')) {
    // Extract coordinates or place from URL
    const placeMatch = url.match(/place\/([^\/]+)/);
    const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    
    if (coordMatch) {
      const lat = coordMatch[1];
      const lng = coordMatch[2];
      return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1`;
    }
    
    if (placeMatch) {
      const place = encodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${place}`;
    }
  }
  
  // For short URLs or other formats, return a search embed
  return null;
}

/**
 * Extract domain from URL for bookmark display
 * Requirement 20.6 - Bookmark preview
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function convertTableToHtml(rows: string[]): string {
  if (rows.length === 0) return '';

  const cells = rows.map(row =>
    row.split('|').map(cell => cell.trim()).filter((cell, idx, arr) => {
      // Filter out empty cells at start/end from | delimiters
      return !(idx === 0 && cell === '') && !(idx === arr.length - 1 && cell === '');
    })
  );

  // Skip separator row if present (contains only dashes and colons)
  const dataCells = cells.filter(row => !row.every(cell => /^:?-+:?$/.test(cell)));

  if (dataCells.length === 0) return '';

  const headers = dataCells[0];
  const dataRows = dataCells.slice(1);

  let html = '<table><thead><tr>';
  headers.forEach(header => {
    html += `<th>${processInlineMarkdown(header)}</th>`;
  });
  html += '</tr></thead>';

  if (dataRows.length > 0) {
    html += '<tbody>';
    dataRows.forEach(row => {
      html += '<tr>';
      // Ensure we have the same number of cells as headers
      for (let i = 0; i < headers.length; i++) {
        const cell = row[i] || '';
        html += `<td>${processInlineMarkdown(cell)}</td>`;
      }
      html += '</tr>';
    });
    html += '</tbody>';
  }

  html += '</table>';
  return html;
}

function htmlToMarkdown(element: HTMLElement): string {
  const lines: string[] = [];

  /**
   * Process a list element (ul/ol) with proper indentation for nested lists
   * Requirements: 11.2 - Preserve list structure with proper markers and indentation
   */
  const processList = (listEl: HTMLElement, indentLevel: number = 0): string => {
    const isOrdered = listEl.tagName.toLowerCase() === 'ol';
    const indent = '  '.repeat(indentLevel);
    const result: string[] = [];
    let itemIndex = 1;

    Array.from(listEl.children).forEach(child => {
      if (child.tagName.toLowerCase() === 'li') {
        const liEl = child as HTMLElement;
        // Get direct text content and inline elements (not nested lists)
        let textContent = '';
        const nestedLists: HTMLElement[] = [];

        Array.from(liEl.childNodes).forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            textContent += node.textContent || '';
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const nodeEl = node as HTMLElement;
            const nodeName = nodeEl.tagName.toLowerCase();
            if (nodeName === 'ul' || nodeName === 'ol') {
              nestedLists.push(nodeEl);
            } else {
              // Process inline elements
              textContent += processNode(node, indentLevel);
            }
          }
        });

        // Create the list item marker
        const marker = isOrdered ? `${itemIndex}.` : '-';
        const itemText = textContent.trim();
        
        if (itemText) {
          result.push(`${indent}${marker} ${itemText}`);
        }

        // Process nested lists with increased indentation
        nestedLists.forEach(nestedList => {
          const nestedMarkdown = processList(nestedList, indentLevel + 1);
          if (nestedMarkdown) {
            result.push(nestedMarkdown);
          }
        });

        itemIndex++;
      }
    });

    return result.join('\n');
  };

  const processNode = (node: Node, depth: number = 0): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Handle lists specially to preserve structure and indentation
    // Requirements: 11.2 - Preserve list structure with proper markers
    if (tag === 'ul' || tag === 'ol') {
      return processList(el, depth);
    }

    const childContent = Array.from(el.childNodes).map(n => processNode(n, depth)).join('');

    switch (tag) {
      case 'h1': return `# ${childContent}`;
      case 'h2': return `## ${childContent}`;
      case 'h3': return `### ${childContent}`;
      // Requirements: 11.3 - Convert HTML formatting to markdown syntax
      case 'strong': case 'b': return `**${childContent}**`;
      case 'em': case 'i': return `*${childContent}*`;
      case 'u': return `__${childContent}__`;
      case 's': case 'del': return `~~${childContent}~~`;
      case 'code': 
        if (el.parentElement?.tagName.toLowerCase() === 'pre') {
          return childContent;
        }
        return `\`${childContent}\``;
      case 'pre': {
        const lang = el.getAttribute('data-language') || '';
        const code = el.textContent || '';
        return `\`\`\`${lang}\n${code}\n\`\`\``;
      }
      case 'blockquote': return `> ${childContent}`;
      case 'a': return `[${childContent}](${el.getAttribute('href') || ''})`;
      case 'hr': return '---';
      case 'li': {
        // This case is now handled by processList, but keep for standalone li elements
        const parent = el.parentElement;
        if (parent?.tagName.toLowerCase() === 'ol') {
          const index = Array.from(parent.children).indexOf(el) + 1;
          return `${index}. ${childContent}`;
        }
        return `- ${childContent}`;
      }
      case 'br': return '\n';
      case 'p': case 'div': return childContent;
      case 'img': {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        return `![${alt}](${src})`;
      }
      case 'table': return convertHtmlTableToMarkdown(el);
      case 'iframe': {
        // Handle embedded iframes (Spotify, etc.)
        const src = el.getAttribute('src') || '';
        if (src.includes('spotify.com')) {
          // Extract Spotify URL from embed
          const match = src.match(/spotify\.com\/embed\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/);
          if (match) {
            return `https://open.spotify.com/${match[1]}/${match[2]}`;
          }
        }
        return src;
      }
      default: {
        // Handle custom media blocks by class name
        if (el.classList.contains('notion-video-block')) {
          const videoType = el.getAttribute('data-video-type');
          const videoId = el.getAttribute('data-video-id');
          if (videoType === 'youtube' && videoId) {
            return `https://www.youtube.com/watch?v=${videoId}`;
          } else if (videoType === 'vimeo' && videoId) {
            return `https://vimeo.com/${videoId}`;
          }
        }
        if (el.classList.contains('notion-audio-block')) {
          const audioType = el.getAttribute('data-audio-type');
          if (audioType === 'spotify') {
            const spotifyType = el.getAttribute('data-spotify-type');
            const spotifyId = el.getAttribute('data-spotify-id');
            if (spotifyType && spotifyId) {
              return `https://open.spotify.com/${spotifyType}/${spotifyId}`;
            }
          } else if (audioType === 'soundcloud') {
            return el.getAttribute('data-url') || '';
          }
        }
        if (el.classList.contains('notion-bookmark-block')) {
          const link = el.querySelector('a');
          if (link) {
            return link.getAttribute('href') || '';
          }
        }
        // Handle embed blocks (Requirements 21.1-21.6)
        if (el.classList.contains('notion-embed-block')) {
          const embedType = el.getAttribute('data-embed-type');
          const url = el.getAttribute('data-url');
          
          // Return the original URL for all embed types
          if (url) {
            return url;
          }
          
          // Fallback: try to extract URL from specific embed types
          if (embedType === 'google-drive') {
            const fileId = el.getAttribute('data-file-id');
            const driveType = el.getAttribute('data-drive-type');
            if (fileId) {
              if (driveType === 'file') {
                return `https://drive.google.com/file/d/${fileId}/view`;
              } else if (driveType === 'document') {
                return `https://docs.google.com/document/d/${fileId}`;
              } else if (driveType === 'spreadsheet') {
                return `https://docs.google.com/spreadsheets/d/${fileId}`;
              } else if (driveType === 'presentation') {
                return `https://docs.google.com/presentation/d/${fileId}`;
              } else if (driveType === 'form') {
                return `https://docs.google.com/forms/d/${fileId}`;
              }
            }
          }
          if (embedType === 'figma') {
            const figmaKey = el.getAttribute('data-figma-key');
            if (figmaKey) {
              return `https://www.figma.com/file/${figmaKey}`;
            }
          }
          if (embedType === 'loom') {
            const loomId = el.getAttribute('data-loom-id');
            if (loomId) {
              return `https://www.loom.com/share/${loomId}`;
            }
          }
          if (embedType === 'gist') {
            const gistUser = el.getAttribute('data-gist-user');
            const gistId = el.getAttribute('data-gist-id');
            if (gistUser && gistId) {
              return `https://gist.github.com/${gistUser}/${gistId}`;
            }
          }
        }
        return childContent;
      }
    }
  };

  Array.from(element.childNodes).forEach(node => {
    const text = processNode(node);
    if (text) lines.push(text);
  });

  // Requirements: 3.2 - Remove sequences of more than 2 consecutive newlines
  // Clean up result - limit to maximum 2 consecutive newlines (one blank line)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function convertHtmlTableToMarkdown(table: HTMLElement): string {
  const rows: string[][] = [];
  
  table.querySelectorAll('tr').forEach(tr => {
    const cells: string[] = [];
    tr.querySelectorAll('th, td').forEach(cell => {
      cells.push(cell.textContent?.trim() || '');
    });
    if (cells.length > 0) {
      rows.push(cells);
    }
  });

  if (rows.length === 0) return '';

  const maxCols = Math.max(...rows.map(r => r.length));
  
  let markdown = '';
  rows.forEach((row, idx) => {
    // Pad row to max columns
    while (row.length < maxCols) row.push('');
    markdown += '| ' + row.join(' | ') + ' |\n';
    
    // Add separator after header
    if (idx === 0) {
      markdown += '| ' + row.map(() => '---').join(' | ') + ' |\n';
    }
  });

  return markdown;
}

function htmlToMarkdownFromString(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return htmlToMarkdown(div);
}

// Type declarations for window.MathJax
declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements: Element[]) => Promise<void>;
      startup?: {
        defaultReady?: () => void;
      };
      tex?: {
        inlineMath?: [string, string][];
        displayMath?: [string, string][];
      };
    };
  }
}
