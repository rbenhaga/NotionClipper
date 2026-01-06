/**
 * ClipperPlateEditor - Main editor component using Plate v52
 * 
 * REFACTORED: Clean implementation using official Plate patterns.
 * 
 * CRITICAL RULES:
 * - ClipperDoc = source of truth
 * - Plate value = view/edit layer only
 * - Editor instance created ONCE (useMemo)
 * - DnD: DndPlugin v52 injects DndProvider via render.aboveSlate
 * - BlockDraggable injected via DndPlugin render.aboveNodes
 * - NO wrapper divs around block elements (causes validateDOMNesting errors)
 */

import React, { forwardRef, useImperativeHandle, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  Plate,
  PlateContent,
  createPlateEditor,
} from 'platejs/react';

import type { ClipperDocument, ClipperEditorState, PlateValue } from '../types';
import { clipperDocToPlate } from '../convert/clipperDocToPlate';
import { plateToClipperDoc } from '../convert/plateToClipperDoc';
import { createEditorPlugins, editorComponents } from '../plugins/editorPlugins';
import { SlashMenu } from '../schema/notionLikeUi';
import { FloatingToolbar } from './plate-ui/floating-toolbar';
import '../styles/plate-notion.css';

export interface ClipperPlateEditorProps {
  /** ClipperDocument to display/edit */
  document?: ClipperDocument;
  /** Called when document changes */
  onChange?: (doc: ClipperDocument) => void;
  /** Called when editor is ready */
  onReady?: () => void;
  /** Read-only mode */
  readOnly?: boolean;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Additional CSS class */
  className?: string;
  /** Debounce delay for onChange (ms) */
  debounceMs?: number;
  /** Theme: 'light' | 'dark' */
  theme?: 'light' | 'dark';
  /** Enable AI features (default: false) */
  enableAi?: boolean;
  /** Show debug panel (DEV only) */
  debug?: boolean;
}

export interface ClipperPlateEditorRef {
  getDocument: () => ClipperDocument | null;
  setDocument: (doc: ClipperDocument) => void;
  markSaved: () => void;
  syncToClipper: () => ClipperDocument | null;
  focus: () => void;
  getState: () => ClipperEditorState;
  insertBlock: (type: string) => void;
}

// Default empty value - MUST have children with text node
const createEmptyValue = (): PlateValue => [
  {
    id: `p-${Date.now()}`,
    type: 'p',
    children: [{ text: '' }],
  },
];

/**
 * ClipperPlateEditor - Plate-powered editor with ClipperDoc as source of truth
 */
export const ClipperPlateEditor = forwardRef<ClipperPlateEditorRef, ClipperPlateEditorProps>(
  function ClipperPlateEditor(props, ref) {
    const {
      document: initialDocument,
      onChange,
      onReady,
      readOnly = false,
      placeholder = "Type '/' for commands...",
      className = '',
      debounceMs = 300,
      theme = 'light',
      enableAi = false,
      debug = false,
    } = props;

    // State
    const [clipperDoc, setClipperDoc] = useState<ClipperDocument | null>(initialDocument || null);
    const [plateValue, setPlateValue] = useState<PlateValue>(() => {
      if (initialDocument) {
        const { value } = clipperDocToPlate(initialDocument);
        return value.length > 0 ? value : createEmptyValue();
      }
      return createEmptyValue();
    });
    const [idMapping, setIdMapping] = useState<Map<string, string>>(new Map());
    const [state, setState] = useState<ClipperEditorState>({
      isDirty: false,
      lastSavedAt: null,
      modifiedBlockIds: new Set(),
      newBlockIds: new Set(),
      deletedBlockIds: new Set(),
    });

    // Slash menu state
    const [slashMenuOpen, setSlashMenuOpen] = useState(false);
    const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
    const [slashFilter, setSlashFilter] = useState('');
    const slashStartPointRef = useRef<{ path: number[]; offset: number } | null>(null);

    // Refs
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastDocHashRef = useRef<string>('');
    const applyingExternalRef = useRef(false);
    const isInitializedRef = useRef(false);

    // Compute stable hash of document content
    const docHash = useMemo(() => {
      if (!initialDocument) return '';
      return JSON.stringify(initialDocument.content);
    }, [initialDocument]);

    // Create editor with plugins ONCE (stable reference)
    const editor = useMemo(() => {
      const initialValue = initialDocument 
        ? clipperDocToPlate(initialDocument).value 
        : createEmptyValue();
      
      const ed = createPlateEditor({
        plugins: createEditorPlugins({
          enableAutoformat: true,
          enableTrailingBlock: true,
          enableBlockSelection: false,
          enableDnd: false,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: (initialValue.length > 0 ? initialValue : createEmptyValue()) as any,
        // Composants pour tous les types d'éléments
        override: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          components: editorComponents as any,
        },
      });
      
      return ed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Create ONCE - never recreate

    // Sync internal state when external document changes
    useEffect(() => {
      if (!initialDocument || !docHash) return;
      
      if (docHash === lastDocHashRef.current) {
        return;
      }
      
      if (!lastDocHashRef.current) {
        lastDocHashRef.current = docHash;
        return;
      }
      
      lastDocHashRef.current = docHash;
      applyingExternalRef.current = true;
      
      const { idMapping: newMapping } = clipperDocToPlate(initialDocument);
      setIdMapping(newMapping.clipperToPlate);
      setClipperDoc(initialDocument);
      
      queueMicrotask(() => { applyingExternalRef.current = false; });
    }, [docHash, initialDocument]);

    // Notify when ready
    useEffect(() => {
      const timer = setTimeout(() => {
        isInitializedRef.current = true;
        onReady?.();
      }, 100);
      return () => clearTimeout(timer);
    }, [onReady]);

    // Helper: Check if change is only a trailing empty paragraph
    const isOnlyTrailingBlockChange = useCallback((newValue: PlateValue, oldValue: PlateValue): boolean => {
      if (newValue.length !== oldValue.length + 1) return false;
      const lastBlock = newValue[newValue.length - 1];
      if (lastBlock.type !== 'p') return false;
      const children = lastBlock.children;
      if (children.length !== 1) return false;
      const firstChild = children[0];
      return 'text' in firstChild && firstChild.text === '';
    }, []);

    // Handle value changes from editor
    const handleChange = useCallback(({ value }: { value: unknown }) => {
      if (readOnly || applyingExternalRef.current) return;
      if (!isInitializedRef.current) return;

      const typedValue = value as PlateValue;
      
      if (isOnlyTrailingBlockChange(typedValue, plateValue)) {
        setPlateValue(typedValue);
        return;
      }
      
      setPlateValue(typedValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (applyingExternalRef.current) return;
        
        const { document: newDoc, modifiedBlockIds, newBlockIds, deletedBlockIds } = 
          plateToClipperDoc(typedValue, {
            existingDocument: clipperDoc || undefined,
            idMapping: {
              clipperToPlate: idMapping,
              plateToClipper: new Map([...idMapping].map(([k, v]) => [v, k])),
            },
          });

        const newHash = JSON.stringify(newDoc.content);
        if (newHash === lastDocHashRef.current) {
          return;
        }

        lastDocHashRef.current = newHash;
        setClipperDoc(newDoc);
        setState(prev => ({
          ...prev,
          isDirty: true,
          modifiedBlockIds: new Set([...prev.modifiedBlockIds, ...modifiedBlockIds]),
          newBlockIds: new Set([...prev.newBlockIds, ...newBlockIds]),
          deletedBlockIds: new Set([...prev.deletedBlockIds, ...deletedBlockIds]),
        }));

        onChange?.(newDoc);
      }, debounceMs);
    }, [clipperDoc, idMapping, onChange, debounceMs, readOnly, plateValue, isOnlyTrailingBlockChange]);

    // Handle slash command selection
    const handleSlashSelect = useCallback((type: string) => {
      setSlashMenuOpen(false);
      
      const startPoint = slashStartPointRef.current;
      const { selection } = editor;
      
      if (startPoint && selection) {
        try {
          const deleteRange = {
            anchor: startPoint,
            focus: selection.anchor,
          };
          editor.tf.select(deleteRange);
          editor.tf.delete();
        } catch (e) {
          console.warn('[ClipperPlateEditor] Failed to delete slash trigger:', e);
        }
      }
      
      slashStartPointRef.current = null;
      setSlashFilter('');
      
      import('../commands/blockCommands').then(({ setBlockType }) => {
        const success = setBlockType(editor, type);
        if (!success) {
          console.warn(`[ClipperPlateEditor] Failed to transform block to: ${type}`);
        }
      }).catch(error => {
        console.error('[ClipperPlateEditor] Failed to load blockCommands:', error);
      });
    }, [editor]);

    // Expose API via ref
    useImperativeHandle(ref, () => ({
      getDocument: () => clipperDoc,
      setDocument: (doc: ClipperDocument) => {
        const { idMapping: newMapping } = clipperDocToPlate(doc);
        setIdMapping(newMapping.clipperToPlate);
        setClipperDoc(doc);
        lastDocHashRef.current = JSON.stringify(doc.content);
      },
      markSaved: () => {
        setState(prev => ({
          ...prev,
          isDirty: false,
          lastSavedAt: new Date(),
          modifiedBlockIds: new Set(),
          newBlockIds: new Set(),
          deletedBlockIds: new Set(),
        }));
      },
      syncToClipper: () => clipperDoc,
      focus: () => {},
      getState: () => state,
      insertBlock: (type: string) => {
        import('../commands/blockCommands').then(({ insertBlockAfter }) => {
          insertBlockAfter(editor, type);
        }).catch(error => {
          console.error('[ClipperPlateEditor] Failed to insert block:', error);
        });
      },
    }), [clipperDoc, state, editor]);

    // Slash menu refs
    const slashMenuRef = useRef<HTMLDivElement>(null);
    const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

    // Handle keyboard events
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      // Open slash menu on /
      if (e.key === '/' && !slashMenuOpen) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSlashMenuPosition({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
          });
          
          const editorSelection = editor.selection;
          if (editorSelection) {
            slashStartPointRef.current = { ...editorSelection.anchor };
          }
          
          setSlashMenuOpen(true);
          setSlashFilter('');
          setSlashSelectedIndex(0);
        }
        return;
      }
      
      // Handle keyboard navigation when menu is open
      if (slashMenuOpen) {
        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            setSlashMenuOpen(false);
            setSlashFilter('');
            slashStartPointRef.current = null;
            break;
          case 'Backspace':
            if (slashFilter.length === 0) {
              setSlashMenuOpen(false);
              slashStartPointRef.current = null;
            } else {
              setSlashFilter(prev => prev.slice(0, -1));
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            setSlashSelectedIndex(prev => prev + 1);
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSlashSelectedIndex(prev => Math.max(0, prev - 1));
            break;
          case 'Enter':
            e.preventDefault();
            slashMenuRef.current?.dispatchEvent(
              new CustomEvent('slash-select', { detail: { index: slashSelectedIndex } })
            );
            break;
          default:
            if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
              setSlashFilter(prev => prev + e.key);
              setSlashSelectedIndex(0);
            }
        }
      }
    }, [slashMenuOpen, slashFilter, slashSelectedIndex, editor]);

    return (
      <div 
        id="scroll_container"
        className={`clipper-plate-editor ${theme} ${className}`}
        data-theme={theme}
        style={{ position: 'relative', overflow: 'visible' }}
      >
        <Plate
          editor={editor}
          onChange={handleChange}
        >
          <PlateContent
            className="clipper-plate-content"
            placeholder={placeholder}
            readOnly={readOnly}
            onKeyDown={handleKeyDown}
            data-plate-selectable
            style={{ minHeight: '200px', outline: 'none' }}
          />
          
          {/* Floating Toolbar - appears on text selection */}
          {!readOnly && <FloatingToolbar />}
        </Plate>

        {/* Slash Menu */}
        <SlashMenu
          isOpen={slashMenuOpen}
          position={slashMenuPosition}
          onSelect={handleSlashSelect}
          onClose={() => setSlashMenuOpen(false)}
          filter={slashFilter}
          enableAi={enableAi}
          selectedIndex={slashSelectedIndex}
          menuRef={slashMenuRef}
        />

        {/* Debug Panel (DEV only) */}
        {debug && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-auto max-h-64">
            <div className="mb-2 font-bold">Debug: ClipperDoc</div>
            <pre>{JSON.stringify(clipperDoc, null, 2)}</pre>
            <div className="mt-4 mb-2 font-bold">Debug: PlateValue</div>
            <pre>{JSON.stringify(plateValue, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }
);

export default ClipperPlateEditor;
