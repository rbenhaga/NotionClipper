/**
 * EnhancedContentEditor - Container style Notion avec TOC flottant
 * Structure : Éditeur pleine largeur + Toolbar en bas + TOC flottant à droite
 * 
 * Supports both single-page TOC (FloatingTOC) and multi-page TOC (MultiPageTOCManager)
 * based on the number of selected pages.
 * 
 * Editor modes:
 * - USE_CLIPPER_EDITOR: New Plate-based editor with ClipperDoc as source of truth
 * - USE_NEW_EDITOR: Modular NotionEditor (legacy)
 * - Default: NotionClipboardEditor (legacy)
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton } from '../common/MotionWrapper';
import { Send, Loader, Paperclip, Mic, Sparkles, X, Layers } from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';

import { NotionClipboardEditor, type NotionClipboardEditorRef, type ClipboardImage, type AttachedFile as EditorAttachedFile } from './NotionClipboardEditor';
import { NotionEditor, type NotionEditorRef } from '@notion-clipper/notion-editor';
import { ClipperPlateEditor, type ClipperPlateEditorRef } from '@notion-clipper/plate-adapter';
import { 
  createClipperDocument, 
  parseContent,
  notionToClipper,
  type ClipperDocument 
} from '@notion-clipper/notion-parser';
import { VoiceRecorder, VoiceRecording } from './VoiceRecorder';

/**
 * Feature flags for editor selection
 * 
 * USE_CLIPPER_EDITOR: New Plate-based editor with ClipperDoc as source of truth
 * - ClipperDoc = canonical format (independent of Plate/Notion)
 * - Plate = view/edit layer only (replaced BlockNote)
 * - Enables future Notion sync with diff/patch
 * - AI: disabled by default via enableAi flag
 * 
 * USE_NEW_EDITOR: Legacy modular NotionEditor (fallback)
 */
const USE_CLIPPER_EDITOR = true;  // New ClipperDoc-based editor (Plate)
const USE_NEW_EDITOR = true;       // Legacy fallback

// Log feature flag status for monitoring
if (typeof window !== 'undefined') {
  console.log(`[EnhancedContentEditor] Editor mode: ${USE_CLIPPER_EDITOR ? 'PLATE' : USE_NEW_EDITOR ? 'NEW' : 'OLD'}`);
}

import { TemplateSelector, Template } from './TemplateSelector';
import { FileUploadModal } from './FileUploadModal';
// FloatingTOC replaced by MultiPageTOCManager for unified single/multi-page experience
import { MultiPageTOCManager, InsertionProgressBar, InsertionErrorModal } from './toc';
import { useTOCState, useMultiPageInsertion } from '../../hooks';
import type { PageInfo, PageStructure, MultiPageTOCState, InsertionMode } from '@notion-clipper/core-shared';

interface AttachedFile {
  id: string;
  file?: File;
  url?: string;
  name: string;
  type: string;
  size?: number;
  preview?: string;
}

export interface EnhancedContentEditorProps {
  clipboard: any;
  editedClipboard: any;
  onEditContent: (content: any) => void;
  onClearClipboard: () => void;
  selectedPage: any;
  selectedPages: string[];
  multiSelectMode: boolean;
  pages: any[];
  onPageSelect?: (page: any) => void;
  onDeselectPage?: (pageId: string) => void;
  sending: boolean;
  onSend: () => void;
  canSend: boolean;
  attachedFiles?: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
  onFileUpload?: (config: any) => Promise<void>;
  maxFileSize?: number;
  fileQuotaRemaining?: number | null;
  onFileQuotaExceeded?: () => void;
  selectedSections?: Array<{ pageId: string; blockId: string; headingText: string }>;
  onSectionSelect?: (pageId: string, blockId: string, headingText: string) => void;
  showNotification?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  config?: any;
  /** Indique si l'utilisateur a édité le contenu */
  hasUserEdited?: boolean;
  /** Callback pour réinitialiser au clipboard original */
  onResetToClipboard?: () => void;
  /** Multi-page TOC state from parent (optional - will use internal state if not provided) */
  tocState?: MultiPageTOCState;
  /** Callback when TOC state changes */
  onTocStateChange?: (state: MultiPageTOCState) => void;
  /** Callback to fetch page structure from Notion API */
  onFetchPageStructure?: (pageId: string) => Promise<PageStructure>;
  /** Callback to insert content into a page (for multi-page insertion) */
  onInsertContent?: (pageId: string, content: any, afterBlockId: string | null, insertionMode?: InsertionMode) => Promise<void>;
  /** Callback to validate if a block exists */
  onValidateBlock?: (pageId: string, blockId: string) => Promise<boolean>;
  /** Callback to track quota usage */
  onTrackQuota?: (pageId: string) => Promise<void>;
}

type ActiveTool = 'none' | 'voice' | 'templates' | 'sections';

export function EnhancedContentEditor({
  clipboard,
  editedClipboard,
  onEditContent,
  onClearClipboard,
  selectedPage,
  selectedPages,
  multiSelectMode,
  pages,
  onDeselectPage: _onDeselectPage,
  onSectionSelect: _onSectionSelect,
  sending,
  onSend,
  canSend,
  attachedFiles = [],
  onFilesChange,
  onFileUpload,
  maxFileSize = 20 * 1024 * 1024,
  fileQuotaRemaining,
  onFileQuotaExceeded,
  selectedSections: _selectedSections = [],
  showNotification,
  tocState: externalTocState,
  onTocStateChange: externalOnTocStateChange,
  onFetchPageStructure,
  onInsertContent,
  onValidateBlock,
  onTrackQuota,
  hasUserEdited = false,
  onResetToClipboard,
}: EnhancedContentEditorProps) {
  // Suppress unused variable warnings
  void _onDeselectPage;
  void _onSectionSelect;
  void _selectedSections;
  const { t } = useTranslation();
  const [activeTool, setActiveTool] = useState<ActiveTool>('none');
  const [showFileModal, setShowFileModal] = useState(false);
  
  // Editor refs - support all editor modes
  const oldEditorRef = useRef<NotionClipboardEditorRef>(null);
  const newEditorRef = useRef<NotionEditorRef>(null);
  const clipperEditorRef = useRef<ClipperPlateEditorRef>(null);
  
  // ClipperDoc state for the new ClipperEditor
  const [clipperDocument, setClipperDocument] = useState<ClipperDocument | null>(null);
  
  // Track last parsed clipboard content hash to avoid re-parsing
  const lastParsedHashRef = useRef<string>('');
  // Track if we're applying external update (to ignore onChange from editor)
  const applyingExternalRef = useRef(false);
  
  // Simple hash function for content comparison
  // 🔧 FIX: Guard against non-string input (clipboard.text/content can be object or undefined)
  const simpleHash = (str: unknown): string => {
    // Ensure we have a string
    const safeStr = typeof str === 'string' ? str : String(str ?? '');
    let hash = 0;
    for (let i = 0; i < safeStr.length; i++) {
      const char = safeStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  };
  
  // Helper: Parse text content into ClipperDocument using notion-parser
  const parseTextToClipperDoc = useCallback((text: string): ClipperDocument => {
    if (!text.trim()) {
      return createClipperDocument({
        title: 'Clipboard Content',
        source: { type: 'clipboard' },
      });
    }
    
    try {
      const parseResult = parseContent(text, { useModernParser: true });
      
      if (parseResult.success && parseResult.blocks.length > 0) {
        const { document } = notionToClipper(parseResult.blocks, {
          title: 'Clipboard Content',
        });
        return document;
      }
    } catch (error) {
      console.warn('[EnhancedContentEditor] Parse error, falling back to single paragraph:', error);
    }
    
    // Fallback: single paragraph if parsing fails
    const doc = createClipperDocument({
      title: 'Clipboard Content',
      source: { type: 'clipboard' },
    });
    doc.content = [{
      id: `clip-${Date.now()}-fallback`,
      type: 'paragraph',
      content: [{ type: 'text', text, styles: {} }],
      props: { textColor: 'default', backgroundColor: 'default' },
      children: [],
      _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
    }];
    return doc;
  }, []);
  
  // Extract clipboard text once (stable reference)
  // 🔧 FIX: Ensure clipboardText is always a string (clipboard.text/content can be object)
  const rawClipboardText = clipboard?.text || clipboard?.content || '';
  const clipboardText = typeof rawClipboardText === 'string' ? rawClipboardText : '';
  const clipboardHash = useMemo(() => simpleHash(clipboardText), [clipboardText]);
  
  // Initialize and sync ClipperDoc from clipboard content
  // ONLY depends on clipboardHash (stable) - NOT on clipboard object
  useEffect(() => {
    if (!USE_CLIPPER_EDITOR) return;
    
    // Skip if we already parsed this exact content
    if (clipboardHash === lastParsedHashRef.current) {
      return;
    }
    
    // Skip re-parsing if user has edited (they own the document now)
    if (hasUserEdited) {
      return;
    }
    
    // Parse and set the document
    lastParsedHashRef.current = clipboardHash;
    applyingExternalRef.current = true;
    const doc = parseTextToClipperDoc(clipboardText);
    setClipperDocument(doc);
    // Reset flag after microtask to allow React to process
    queueMicrotask(() => { applyingExternalRef.current = false; });
  }, [clipboardHash, clipboardText, hasUserEdited, parseTextToClipperDoc]);
  
  // Handle editor onChange - only propagate if NOT applying external update
  const handleEditorChange = useCallback((doc: ClipperDocument) => {
    if (applyingExternalRef.current) return;
    setClipperDocument(doc);
  }, []);

  // Convert pages to PageInfo format for TOC
  const selectedPageInfos: PageInfo[] = useMemo(() => {
    if (multiSelectMode) {
      return selectedPages
        .map(id => pages.find(p => p.id === id))
        .filter(Boolean)
        .map(p => ({
          id: p.id,
          title: p.title || 'Untitled',
          icon: p.icon?.emoji || p.icon?.external?.url || p.icon?.file?.url,
        }));
    }
    return selectedPage ? [{
      id: selectedPage.id,
      title: selectedPage.title || 'Untitled',
      icon: selectedPage.icon?.emoji || selectedPage.icon?.external?.url || selectedPage.icon?.file?.url,
    }] : [];
  }, [multiSelectMode, selectedPages, selectedPage, pages]);

  // Internal TOC state management (used if external state not provided)
  const internalTocState = useTOCState(selectedPageInfos);
  
  // Use external state if provided, otherwise use internal state
  const tocState = externalTocState || internalTocState.tocState;
  const handleTocStateChange = useCallback((newState: MultiPageTOCState) => {
    if (externalOnTocStateChange) {
      externalOnTocStateChange(newState);
    } else {
      internalTocState.setTocState(newState);
    }
  }, [externalOnTocStateChange, internalTocState]);

  // Default page structure fetcher (uses electronAPI if available)
  const handleFetchPageStructure = useCallback(async (pageId: string): Promise<PageStructure> => {
    if (onFetchPageStructure) {
      return onFetchPageStructure(pageId);
    }
    
    // Default implementation using electronAPI
    // @ts-ignore - electronAPI is injected by Electron
    if (typeof window !== 'undefined' && window.electronAPI?.getPageBlocks) {
      try {
        // @ts-ignore
        const blocks = await window.electronAPI.getPageBlocks(pageId);
        const page = pages.find(p => p.id === pageId);
        
        // Extract headings from blocks
        const headings = blocks
          .filter((block: any) => 
            block.type === 'heading_1' || 
            block.type === 'heading_2' || 
            block.type === 'heading_3'
          )
          .map((block: any, index: number) => ({
            id: block.id,
            text: block[block.type]?.rich_text?.[0]?.plain_text || 'Untitled',
            level: block.type === 'heading_1' ? 1 : block.type === 'heading_2' ? 2 : 3,
            position: index,
          }));

        return {
          pageId,
          pageTitle: page?.title || 'Untitled',
          headings,
          totalBlocks: blocks.length,
          fetchedAt: Date.now(),
        };
      } catch (error) {
        console.error('Failed to fetch page structure:', error);
        throw error;
      }
    }
    
    // Fallback: return empty structure
    const page = pages.find(p => p.id === pageId);
    return {
      pageId,
      pageTitle: page?.title || 'Untitled',
      headings: [],
      totalBlocks: 0,
      fetchedAt: Date.now(),
    };
  }, [onFetchPageStructure, pages]);

  // Determine if we should show multi-page TOC (Req 1.1)
  const showMultiPageTOC = multiSelectMode && selectedPages.length > 1;

  // Multi-page insertion hook (Req 9.1, 9.4, 9.5, 9.6, 9.7, 9.8)
  const {
    isInserting,
    progress: insertionProgress,
    results: insertionResults,
    showErrorModal,
    setShowErrorModal,
    executeInsertion,
    summary: insertionSummary,
  } = useMultiPageInsertion({
    insertContent: onInsertContent || (async (pageId, content, afterBlockId, insertionMode) => {
      // Default implementation using electronAPI.sendToNotion
      // @ts-ignore - electronAPI is injected by Electron
      if (typeof window !== 'undefined' && window.electronAPI?.sendToNotion) {
        const sendData = {
          pageId,
          content,
          options: {
            type: 'paragraph',
            ...(afterBlockId && { afterBlockId }),
            ...(insertionMode && { insertionMode })
          }
        };
        // @ts-ignore
        const result = await window.electronAPI.sendToNotion(sendData);
        if (!result.success) {
          throw new Error(result.error || 'Failed to insert content');
        }
      } else {
        throw new Error('Electron API not available');
      }
    }),
    validateBlock: onValidateBlock,
    trackQuota: onTrackQuota,
    showNotification,
  });

  // Check if we have multi-section selections (multiple targets on any page)
  const hasMultiSectionSelections = useMemo(() => {
    for (const selection of tocState.selections.values()) {
      if (selection.targets && selection.targets.length > 0) {
        return true;
      }
    }
    return false;
  }, [tocState.selections]);

  // ✅ FIX: Unified buildSendPayload - ALWAYS use ClipperDoc when available
  // This ensures structure is preserved regardless of send path (TOC or not)
  const buildSendPayload = useCallback(() => {
    if (USE_CLIPPER_EDITOR && clipperDocument) {
      // ✅ ClipperDoc = source of truth, preserves all structure
      return {
        kind: 'clipperDoc' as const,
        clipperDocument,
        meta: {
          source: 'clipboard' as const,
          timestamp: Date.now(),
        },
      };
    }
    // Fallback to raw clipboard for legacy editors only
    return {
      kind: 'raw' as const,
      clipboard: editedClipboard || clipboard,
      meta: {
        source: 'clipboard' as const,
        timestamp: Date.now(),
      },
    };
  }, [clipperDocument, editedClipboard, clipboard]);

  // Enhanced send handler - unified path for all send modes
  // ✅ FIX: Both TOC and non-TOC paths use buildSendPayload()
  const handleSendWithTOC = useCallback(async () => {
    const content = buildSendPayload();
    
    if (!content) {
      showNotification?.('No content to send', 'error');
      return;
    }

    // Use new insertion flow if:
    // 1. Multi-page mode with TOC selections, OR
    // 2. Single page with multi-section selections (targets array)
    const shouldUseNewInsertion = (showMultiPageTOC && tocState.selections.size > 0) || hasMultiSectionSelections;
    
    if (shouldUseNewInsertion) {
      // Execute multi-page insertion with TOC state
      await executeInsertion(tocState, content);
    } else {
      // ✅ FIX: Even without TOC, send structured payload via electronAPI
      // @ts-ignore - electronAPI is injected by Electron
      if (typeof window !== 'undefined' && window.electronAPI?.sendToNotion && selectedPage) {
        try {
          // @ts-ignore
          const result = await window.electronAPI.sendToNotion({
            pageId: selectedPage.id,
            content,
            options: { type: 'structured' }
          });
          if (!result.success) {
            showNotification?.(result.error || 'Failed to send', 'error');
          } else {
            showNotification?.('Content sent successfully', 'success');
          }
        } catch (error: any) {
          showNotification?.(error.message || 'Failed to send', 'error');
        }
      } else {
        // Ultimate fallback to legacy onSend (should rarely happen)
        onSend();
      }
    }
  }, [buildSendPayload, showMultiPageTOC, tocState, hasMultiSectionSelections, executeInsertion, selectedPage, showNotification, onSend]);

  const currentClipboard = editedClipboard || clipboard;
  const contentText = useMemo(() => {
    const raw = editedClipboard?.text ?? editedClipboard?.content ??
                currentClipboard?.text ?? currentClipboard?.content ?? '';
    return typeof raw === 'string' ? raw : '';
  }, [editedClipboard, currentClipboard]);

  const hasImage = clipboard?.type === 'image' || clipboard?.images?.length > 0;

  // Extract images from clipboard for inline display
  const clipboardImages: ClipboardImage[] = useMemo(() => {
    if (!clipboard) return [];
    if (clipboard.images && Array.isArray(clipboard.images)) {
      return clipboard.images;
    }
    if (clipboard.type === 'image' && (clipboard.data || clipboard.content || clipboard.preview)) {
      return [{
        id: 'clipboard-image',
        data: clipboard.data,
        content: clipboard.content,
        preview: clipboard.preview,
        size: clipboard.bufferSize || clipboard.size,
      }];
    }
    return [];
  }, [clipboard]);

  const handleContentChange = useCallback((text: string) => {
    onEditContent({ ...currentClipboard, text, content: text });
  }, [currentClipboard, onEditContent]);

  // Handle image removal
  const handleImageRemove = useCallback((index: number) => {
    // For now, clearing clipboard removes all images
    // In the future, we could support multiple images
    if (index === 0 && clipboardImages.length === 1) {
      onClearClipboard();
    }
  }, [clipboardImages.length, onClearClipboard]);

  // Handle adding files from editor drag & drop
  const handleFilesAdd = useCallback((newFiles: AttachedFile[]) => {
    onFilesChange?.([...attachedFiles, ...newFiles]);
  }, [attachedFiles, onFilesChange]);

  const handleTemplateSelect = useCallback((template: Template) => {
    // Phase 3: Insérer au curseur au lieu de remplacer ✅
    const content = template.structure.map(item => {
      switch (item.type) {
        case 'heading': return `# ${item.content || ''}`;
        case 'bullet_list': return `- ${item.content || ''}`;
        case 'numbered_list': return `1. ${item.content || ''}`;
        case 'todo': return `- [ ] ${item.content || ''}`;
        case 'quote': return `> ${item.content || ''}`;
        default: return item.content || '';
      }
    }).join('\n');

    // Insert at cursor instead of replacing
    // Use the appropriate ref based on which editor is active
    if (USE_CLIPPER_EDITOR) {
      // For ClipperEditor, we need to update the ClipperDoc
      // For now, append to the document (TODO: insert at cursor)
      if (clipperDocument) {
        const newBlock = {
          id: `clip-${Date.now()}-template`,
          type: 'paragraph' as const,
          content: [{ type: 'text' as const, text: content, styles: {} }],
          props: { textColor: 'default' as const, backgroundColor: 'default' as const },
          children: [],
          _meta: { contentHash: '', modifiedAt: new Date().toISOString() },
        };
        setClipperDocument({
          ...clipperDocument,
          content: [...clipperDocument.content, newBlock],
          metadata: {
            ...clipperDocument.metadata,
            updatedAt: new Date().toISOString(),
          },
        });
      }
    } else {
      const activeRef = USE_NEW_EDITOR ? newEditorRef : oldEditorRef;
      if (activeRef.current) {
        activeRef.current.insertAtCursor('\n' + content + '\n');
      }
    }

    setActiveTool('none');
    showNotification?.(`Template "${template.name}" inserted`, 'success');
  }, [showNotification]);

  const handleVoiceComplete = useCallback((_: VoiceRecording) => {
    showNotification?.('Recording complete', 'success');
  }, [showNotification]);

  const handleTranscription = useCallback((text: string) => {
    const newContent = contentText ? `${contentText}\n\n${text}` : text;
    handleContentChange(newContent);
    showNotification?.('Transcription added', 'success');
  }, [contentText, handleContentChange, showNotification]);

  const handleRemoveFile = useCallback((id: string) => {
    onFilesChange?.(attachedFiles.filter(f => f.id !== id));
  }, [attachedFiles, onFilesChange]);

  const handleFileUpload = useCallback(async (config: any) => {
    if (onFileUpload) await onFileUpload(config);
    if (config.files) {
      const newFiles: AttachedFile[] = await Promise.all(
        config.files.map(async (file: File) => {
          let preview: string | undefined;
          if (file.type.startsWith('image/')) {
            preview = await new Promise<string>(resolve => {
              const reader = new FileReader();
              reader.onload = e => resolve(e.target?.result as string);
              reader.readAsDataURL(file);
            });
          }
          return { id: `${Date.now()}-${Math.random()}`, file, name: file.name, type: file.type, size: file.size, preview };
        })
      );
      onFilesChange?.([...attachedFiles, ...newFiles]);
    }
  }, [attachedFiles, onFilesChange, onFileUpload]);

  // 🎨 Design System V2: Séparation claire modes vs actions
  // Modes = changent le contexte d'édition (tabs style)
  // Actions = fonctionnalités ponctuelles (boutons)
  const modes = [
    { id: 'sections' as const, icon: <Layers size={14} />, label: 'Sections' },
  ];
  
  const actions = [
    { id: 'voice' as const, icon: <Mic size={14} />, label: 'Voice', disabled: false },
    { id: 'templates' as const, icon: <Sparkles size={14} />, label: 'Templates', disabled: false },
  ];

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#191919] h-full min-h-0 relative">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Notion-style editor with integrated images and files */}
          {/* Feature flags control which editor is rendered:
              - USE_CLIPPER_EDITOR: New Plate-based editor with ClipperDoc
              - USE_NEW_EDITOR: Legacy modular NotionEditor
              - Default: NotionClipboardEditor
          */}
          {USE_CLIPPER_EDITOR && clipperDocument ? (
            <ClipperPlateEditor
              ref={clipperEditorRef}
              document={clipperDocument}
              onChange={handleEditorChange}
              placeholder={t('editor.placeholderText') || "Commencez à écrire..."}
              theme="light"
              debounceMs={300}
              className="min-h-[200px]"
              enableAi={false}
            />
          ) : USE_NEW_EDITOR ? (
            <NotionEditor
              ref={newEditorRef}
              content={contentText}
              onChange={handleContentChange}
              placeholder={t('editor.placeholderText') || "Commencez à écrire..."}
              // Clipboard sync props
              clipboardContent={clipboard?.text || clipboard?.content || ''}
              hasUserEdited={hasUserEdited}
              onResetToClipboard={onResetToClipboard}
              // Images inline
              images={clipboardImages}
              onImageRemove={handleImageRemove}
              // Files inline
              attachedFiles={attachedFiles}
              onFileRemove={handleRemoveFile}
              onFilesAdd={handleFilesAdd}
              // Quotas
              fileQuotaRemaining={fileQuotaRemaining}
              maxFileSize={maxFileSize}
              onFileQuotaExceeded={onFileQuotaExceeded}
              showNotification={showNotification}
              // Live Markdown & Line-start shortcuts (Requirements: 16.1-16.5, 17.1-17.9)
              enableLiveMarkdown={true}
              enableLineStartShortcuts={true}
            />
          ) : (
            <NotionClipboardEditor
              ref={oldEditorRef}
              content={contentText}
              onChange={handleContentChange}
              placeholder={t('editor.placeholderText') || "Commencez à écrire..."}
              // Clipboard sync props
              clipboardContent={clipboard?.text || clipboard?.content || ''}
              hasUserEdited={hasUserEdited}
              onResetToClipboard={onResetToClipboard}
              // Images inline
              images={clipboardImages}
              onImageRemove={handleImageRemove}
              // Files inline
              attachedFiles={attachedFiles}
              onFileRemove={handleRemoveFile}
              onFilesAdd={handleFilesAdd}
              // Quotas
              fileQuotaRemaining={fileQuotaRemaining}
              maxFileSize={maxFileSize}
              onFileQuotaExceeded={onFileQuotaExceeded}
              showNotification={showNotification}
            />
          )}

          {/* Tool panels (Voice & Templates only - Sections is floating) */}
          <AnimatePresence>
            {(activeTool === 'voice' || activeTool === 'templates') && (
              <MotionDiv
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
              >
                {activeTool === 'voice' && (
                  <VoiceRecorder
                    onRecordingComplete={handleVoiceComplete}
                    onTranscriptionComplete={handleTranscription}
                    autoTranscribe
                    language="fr-FR"
                  />
                )}
                {activeTool === 'templates' && (
                  <TemplateSelector
                    onSelectTemplate={handleTemplateSelect}
                    onCreateCustom={() => showNotification?.('Custom templates coming soon', 'info')}
                  />
                )}
              </MotionDiv>
            )}
          </AnimatePresence>

          {/* Note: Attached files are now displayed inline in NotionClipboardEditor */}
        </div>
      </div>

      {/* Floating TOC Panel - appears above content when Sections tool is active */}
      <AnimatePresence>
        {activeTool === 'sections' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 left-4 right-4 z-30 max-w-3xl mx-auto"
          >
            {selectedPageInfos.length > 0 ? (
              <MultiPageTOCManager
                selectedPages={selectedPageInfos}
                tocState={tocState}
                onTocStateChange={handleTocStateChange}
                onFetchPageStructure={handleFetchPageStructure}
                mode="sidebar"
                className="w-full shadow-lg"
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                    <Layers size={24} className="text-purple-500 dark:text-purple-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    {t('common.noPageSelected')}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('common.selectPagesToStart')}
                  </p>
                </div>
              </div>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Bottom toolbar - fixed at bottom */}
      <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#191919]">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* 🎨 Design System V2: Modes (tabs) + Actions (boutons) */}
          <div className="flex items-center gap-3">
            {/* Modes - Style tabs (changent le contexte) */}
            <div className="ds-tabs">
              {modes.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setActiveTool(activeTool === mode.id ? 'none' : mode.id)}
                  className={`ds-tab ${activeTool === mode.id ? 'ds-tab-active' : ''}`}
                >
                  {mode.icon}
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              ))}
            </div>
            
            {/* Séparateur */}
            <div className="w-px h-5 bg-[var(--ds-border)]" />
            
            {/* Actions - Style boutons (fonctionnalités ponctuelles) */}
            <div className="ds-action-bar">
              {actions.map(action => (
                <button
                  key={action.id}
                  onClick={() => setActiveTool(activeTool === action.id ? 'none' : action.id)}
                  disabled={action.disabled}
                  className={`ds-action-btn ${activeTool === action.id ? 'bg-[var(--ds-primary-subtle)] text-[var(--ds-primary)] border-[var(--ds-primary)]/20' : ''}`}
                >
                  {action.icon}
                  <span className="hidden sm:inline">{action.label}</span>
                </button>
              ))}
              <button
                onClick={() => fileQuotaRemaining === 0 ? onFileQuotaExceeded?.() : setShowFileModal(true)}
                disabled={sending || fileQuotaRemaining === 0}
                className="ds-action-btn"
              >
                <Paperclip size={14} />
                <span className="hidden sm:inline">{t('common.attach')}</span>
              </button>
            </div>
          </div>

          {/* Send button - CTA VIOLET UNIFIÉ (Design System V2) */}
          <MotionButton
            onClick={handleSendWithTOC}
            disabled={!canSend || sending || isInserting}
            className={`ds-btn ds-btn-md flex items-center gap-2 transition-all ${
              !canSend || sending || isInserting
                ? 'bg-[var(--ds-bg-muted)] text-[var(--ds-fg-subtle)] cursor-not-allowed border border-[var(--ds-border)]'
                : 'ds-btn-primary shadow-sm hover:shadow-md'
            }`}
            whileTap={{ scale: canSend && !sending && !isInserting ? 0.98 : 1 }}
          >
            {(sending || isInserting) ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
            <span>{t('common.send')}</span>
          </MotionButton>
        </div>
      </div>

      {/* Insertion Progress Bar (Req 9.4) */}
      <InsertionProgressBar
        isVisible={isInserting}
        progress={insertionProgress}
        className="fixed bottom-24 right-6 w-80 z-50"
      />

      {/* Insertion Error Modal (Req 9.8) */}
      <InsertionErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        results={insertionResults}
        totalTimeMs={insertionSummary?.totalTimeMs}
      />

      <FileUploadModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        onAdd={handleFileUpload}
        maxSize={maxFileSize}
      />
    </div>
  );
}
