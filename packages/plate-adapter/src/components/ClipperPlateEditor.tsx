/**
 * ClipperPlateEditor - Main editor component using Plate v49
 * 
 * Notion-like editor with ClipperDoc as source of truth.
 * Uses Plate framework for rich editing experience.
 * 
 * CRITICAL RULES:
 * - ClipperDoc = source of truth
 * - Plate value = view/edit layer only
 * - Editor instance created ONCE (useMemo)
 * - Value is CONTROLLED - updates on clipboard change
 * - AI disabled by default via enableAi flag
 */

import React, { forwardRef, useImperativeHandle, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  Plate,
  PlateContent,
  createPlateEditor,
} from '@udecode/plate/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import type { ClipperDocument, ClipperEditorState, PlateValue } from '../types';
import { clipperDocToPlate } from '../convert/clipperDocToPlate';
import { plateToClipperDoc } from '../convert/plateToClipperDoc';
import { createEditorPlugins } from '../plugins/editorPlugins';
import { SlashMenu } from '../schema/notionLikeUi';
import { plateComponents } from './plate-elements';
import { withDraggables } from './withDraggable';
import '../styles/plate-notion.css';

// Apply withDraggable to root-level block components
// The HOC uses useDraggable/useDropLine INSIDE the component (in Plate context)
const draggableComponents = withDraggables(plateComponents, [
  'p',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'action_item',
  'blockquote',
  'code_block',
  'hr',
]);

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
    // ✅ FIX: Store the START POINT (not range) where "/" was typed
    // We'll delete from this point to current cursor when command is selected
    const slashStartPointRef = useRef<{ path: number[]; offset: number } | null>(null);

    // Double Ctrl+A state - DISABLED (BlockSelection causes errors)
    // TODO: Re-enable when BlockSelection works
    // const lastCtrlARef = useRef<number>(0);
    // const DOUBLE_CTRL_A_THRESHOLD = 500; // ms

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
    // Uses createEditorPlugins() for proper plugin order:
    // 1. Core blocks → 2. Marks → 3. Autoformat → 4. Breaks → 5. Reset → 6. Trailing → 7. NodeId → 8. BlockSelection → 9. DnD
    const editor = useMemo(() => {
      const initialValue = initialDocument 
        ? clipperDocToPlate(initialDocument).value 
        : createEmptyValue();
      
      return createPlateEditor({
        plugins: createEditorPlugins({
          enableAutoformat: true,     // # → H1, - → list, etc.
          enableSoftBreak: true,      // Shift+Enter = line break
          enableExitBreak: true,      // Enter at end of heading = new paragraph
          enableResetNode: true,      // Backspace at start = reset to paragraph
          enableTrailingBlock: true,  // Ensure doc ends with paragraph
          enableBlockSelection: false, // TODO: re-enable
          enableDnd: true,            // DnD via withDraggables HOC
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: (initialValue.length > 0 ? initialValue : createEmptyValue()) as any,
        // Draggable components - withDraggables adds DnD handles
        override: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          components: draggableComponents as any,
        },
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Create ONCE - never recreate

    // Sync internal state when external document changes
    // Uses docHash (stable string) to detect real changes
    useEffect(() => {
      if (!initialDocument || !docHash) return;
      
      // Skip if hash hasn't changed
      if (docHash === lastDocHashRef.current) {
        return;
      }
      
      // First mount - just record the hash
      if (!lastDocHashRef.current) {
        lastDocHashRef.current = docHash;
        return;
      }
      
      // External update - sync internal state only
      lastDocHashRef.current = docHash;
      applyingExternalRef.current = true;
      
      const { idMapping: newMapping } = clipperDocToPlate(initialDocument);
      setIdMapping(newMapping.clipperToPlate);
      setClipperDoc(initialDocument);
      
      // Reset flag after microtask
      queueMicrotask(() => { applyingExternalRef.current = false; });
    }, [docHash, initialDocument]);

    // Notify when ready and mark as initialized
    useEffect(() => {
      // Delay initialization flag to allow Plate to settle
      const timer = setTimeout(() => {
        isInitializedRef.current = true;
        onReady?.();
      }, 100);
      return () => clearTimeout(timer);
    }, [onReady]);

    // Helper: Check if change is only a trailing empty paragraph (from TrailingBlockPlugin)
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
      // Skip if read-only or applying external update
      if (readOnly || applyingExternalRef.current) return;

      // Skip first few onChange calls during initialization to prevent loops
      if (!isInitializedRef.current) {
        return;
      }

      // Cast to our PlateValue type for internal use
      const typedValue = value as PlateValue;
      
      // Skip if this is just TrailingBlockPlugin adding an empty paragraph
      if (isOnlyTrailingBlockChange(typedValue, plateValue)) {
        setPlateValue(typedValue); // Update local state but don't propagate
        return;
      }
      
      setPlateValue(typedValue);

      // Debounce the ClipperDoc update
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        // Double-check we're not in external update
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
          return; // No actual change
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

    // ✅ P0-4: Handle slash command with real block transformation
    // ✅ FIX: Delete "/query" from start point to current cursor
    const handleSlashSelect = useCallback((type: string) => {
      setSlashMenuOpen(false);
      
      // Delete the slash trigger text ("/query") before transforming
      // We delete from slashStartPoint to current selection.anchor
      const startPoint = slashStartPointRef.current;
      const { selection } = editor;
      
      if (startPoint && selection) {
        try {
          // Create range from "/" start to current cursor position
          const deleteRange = {
            anchor: startPoint,
            focus: selection.anchor, // Use anchor (where cursor is now)
          };
          editor.tf.select(deleteRange);
          editor.tf.delete();
        } catch (e) {
          console.warn('[ClipperPlateEditor] Failed to delete slash trigger:', e);
        }
      }
      
      slashStartPointRef.current = null;
      setSlashFilter('');
      
      // Import and use command bus for block transformation
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
        // Update internal state only - don't call editor.tf.setValue to avoid loops
        const { idMapping: newMapping } = clipperDocToPlate(doc);
        setIdMapping(newMapping.clipperToPlate);
        setClipperDoc(doc);
        lastDocHashRef.current = JSON.stringify(doc.content);
        // Note: Editor value is not updated - use this for syncing state only
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
        // ✅ P0-4: Use command bus for block insertion
        import('../commands/blockCommands').then(({ insertBlockAfter }) => {
          insertBlockAfter(editor, type);
        }).catch(error => {
          console.error('[ClipperPlateEditor] Failed to insert block:', error);
        });
      },
    }), [clipperDoc, state]);

    // Ref for slash menu to delegate keyboard events
    const slashMenuRef = useRef<HTMLDivElement>(null);
    const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

    // Ctrl+A handler - let browser/Slate handle it normally
    // BlockSelection is disabled due to [USE_ELEMENT_CONTEXT] errors
    // TODO: Re-enable custom Ctrl+A when BlockSelection works
    const handleDoubleCtrlA = useCallback((_e: React.KeyboardEvent) => {
      // Let default behavior happen
      return false;
    }, []);

    // Handle keyboard events for slash menu and Ctrl+A
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      // ✅ Double Ctrl+A: bloc puis tout
      if (e.key === 'a' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (handleDoubleCtrlA(e)) {
          return;
        }
      }
      
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
          
          // ✅ FIX: Store the START POINT (anchor) BEFORE "/" is inserted
          // We'll delete from this point to cursor when command is selected
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
            // Trigger selection via ref callback
            slashMenuRef.current?.dispatchEvent(
              new CustomEvent('slash-select', { detail: { index: slashSelectedIndex } })
            );
            break;
          default:
            // Accumulate filter characters (letters only)
            if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
              setSlashFilter(prev => prev + e.key);
              setSlashSelectedIndex(0);
            }
        }
      }
    }, [slashMenuOpen, slashFilter, slashSelectedIndex, handleDoubleCtrlA, editor]);

    return (
      <DndProvider backend={HTML5Backend}>
        <div 
          id="scroll_container"
          className={`clipper-plate-editor ${theme} ${className}`}
          data-theme={theme}
          style={{ position: 'relative' }}
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
      </DndProvider>
    );
  }
);

export default ClipperPlateEditor;