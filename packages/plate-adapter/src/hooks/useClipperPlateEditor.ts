/**
 * useClipperPlateEditor - Hook for managing editor with ClipperDoc
 * 
 * This hook manages the bidirectional sync between ClipperDoc (source of truth)
 * and Plate editor state.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPlateEditor } from '@udecode/plate/react';
import {
  BaseParagraphPlugin,
  NodeIdPlugin,
  TrailingBlockPlugin,
} from '@udecode/plate';
import { BaseHeadingPlugin } from '@udecode/plate-heading';
import { BaseListPlugin } from '@udecode/plate-list';
import { BaseBlockquotePlugin } from '@udecode/plate-block-quote';
import { BaseCodeBlockPlugin } from '@udecode/plate-code-block';
import { BaseHorizontalRulePlugin } from '@udecode/plate-horizontal-rule';
import { BaseLinkPlugin } from '@udecode/plate-link';
import {
  BaseBoldPlugin,
  BaseItalicPlugin,
  BaseUnderlinePlugin,
  BaseStrikethroughPlugin,
  BaseCodePlugin,
} from '@udecode/plate-basic-marks';

import type { 
  ClipperDocument, 
  PlateValue, 
  IdMapping, 
  ClipperEditorState,
} from '../types';
import { clipperDocToPlate } from '../convert/clipperDocToPlate';
import { plateToClipperDoc } from '../convert/plateToClipperDoc';

interface UseClipperPlateEditorOptions {
  initialDoc?: ClipperDocument;
  onChange?: (doc: ClipperDocument) => void;
  debounceMs?: number;
  readOnly?: boolean;
  enableAi?: boolean;
}

interface UseClipperPlateEditorReturn {
  editor: ReturnType<typeof createPlateEditor>;
  plateValue: PlateValue;
  setPlateValue: (value: PlateValue) => void;
  document: ClipperDocument | null;
  idMapping: IdMapping;
  state: ClipperEditorState;
  actions: {
    insertBlock: (type: string) => void;
    insertDivider: () => void;
    toggleTodo: (blockId: string) => void;
    reset: () => void;
    markSaved: () => void;
  };
  handleChange: (value: unknown) => void;
}

// Default empty value
const createEmptyValue = (): PlateValue => [
  {
    id: `p-${Date.now()}`,
    type: 'p',
    children: [{ text: '' }],
  },
];

export function useClipperPlateEditor(
  options: UseClipperPlateEditorOptions = {}
): UseClipperPlateEditorReturn {
  const {
    initialDoc,
    onChange,
    debounceMs = 300,
    readOnly = false,
  } = options;

  // State
  const [plateValue, setPlateValue] = useState<PlateValue>(() => {
    if (initialDoc) {
      const { value } = clipperDocToPlate(initialDoc);
      return value.length > 0 ? value : createEmptyValue();
    }
    return createEmptyValue();
  });
  const [document, setDocument] = useState<ClipperDocument | null>(initialDoc || null);
  const [idMapping, setIdMapping] = useState<IdMapping>({
    clipperToPlate: new Map(),
    plateToClipper: new Map(),
  });
  const [state, setState] = useState<ClipperEditorState>({
    isDirty: false,
    lastSavedAt: null,
    modifiedBlockIds: new Set(),
    newBlockIds: new Set(),
    deletedBlockIds: new Set(),
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDocHashRef = useRef<string>('');

  // Create editor with plugins
  const editor = useMemo(() => {
    return createPlateEditor({
      plugins: [
        BaseParagraphPlugin,
        BaseHeadingPlugin,
        BaseListPlugin,
        BaseBlockquotePlugin,
        BaseCodeBlockPlugin,
        BaseHorizontalRulePlugin,
        BaseLinkPlugin,
        BaseBoldPlugin,
        BaseItalicPlugin,
        BaseUnderlinePlugin,
        BaseStrikethroughPlugin,
        BaseCodePlugin,
        NodeIdPlugin,
        TrailingBlockPlugin.configure({
          options: { type: 'p' },
        }),
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: plateValue as any,
    });
  }, []);

  // Initialize from ClipperDoc
  useEffect(() => {
    if (initialDoc) {
      const { value, idMapping: newMapping } = clipperDocToPlate(initialDoc);
      const newValue = value.length > 0 ? value : createEmptyValue();
      setPlateValue(newValue);
      setIdMapping(newMapping);
      setDocument(initialDoc);
      lastDocHashRef.current = JSON.stringify(initialDoc.content);
    }
  }, [initialDoc]);

  // Handle changes
  const handleChange = useCallback((newValue: unknown) => {
    const typedValue = newValue as PlateValue;
    setPlateValue(typedValue);

    if (readOnly) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const { 
        document: newDoc, 
        modifiedBlockIds, 
        newBlockIds, 
        deletedBlockIds 
      } = plateToClipperDoc(typedValue, {
        existingDocument: document || undefined,
        idMapping,
      });

      const newHash = JSON.stringify(newDoc.content);
      if (newHash === lastDocHashRef.current) {
        return;
      }

      lastDocHashRef.current = newHash;
      setDocument(newDoc);
      setState(prev => ({
        ...prev,
        isDirty: true,
        modifiedBlockIds: new Set([...prev.modifiedBlockIds, ...modifiedBlockIds]),
        newBlockIds: new Set([...prev.newBlockIds, ...newBlockIds]),
        deletedBlockIds: new Set([...prev.deletedBlockIds, ...deletedBlockIds]),
      }));

      onChange?.(newDoc);
    }, debounceMs);
  }, [document, idMapping, onChange, debounceMs, readOnly]);

  // Actions
  const actions = useMemo(() => ({
    insertBlock: (_type: string) => {
      console.log('[useClipperPlateEditor] insertBlock - not implemented');
    },
    insertDivider: () => {
      console.log('[useClipperPlateEditor] insertDivider - not implemented');
    },
    toggleTodo: (_blockId: string) => {
      console.log('[useClipperPlateEditor] toggleTodo - not implemented');
    },
    reset: () => {
      if (initialDoc) {
        const { value, idMapping: newMapping } = clipperDocToPlate(initialDoc);
        const newValue = value.length > 0 ? value : createEmptyValue();
        setPlateValue(newValue);
        setIdMapping(newMapping);
        setDocument(initialDoc);
        lastDocHashRef.current = JSON.stringify(initialDoc.content);
        setState({
          isDirty: false,
          lastSavedAt: null,
          modifiedBlockIds: new Set(),
          newBlockIds: new Set(),
          deletedBlockIds: new Set(),
        });
      }
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
  }), [initialDoc]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    editor,
    plateValue,
    setPlateValue,
    document,
    idMapping,
    state,
    actions,
    handleChange,
  };
}

export default useClipperPlateEditor;
