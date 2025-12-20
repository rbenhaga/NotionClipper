/**
 * BlockDraggable - Plate v49 official DnD pattern
 * 
 * Used via DndPlugin's render.aboveNodes option.
 * Renders drag handle + drop line "above" the node without wrapping it.
 * 
 * Key points:
 * - NO hooks in the factory function (BlockDraggable itself)
 * - Hooks are ONLY in DraggableInner (a real React component)
 * - previewRef attached to the actual node DOM via cloneElement
 * - No conditional hook calls
 */

import React from 'react';
import type { TElement } from '@udecode/plate';
import { useDraggable, useDropLine } from '@udecode/plate-dnd';

// Element with required id for DnD
type ElementWithId = TElement & { id: string };

/**
 * Merge multiple refs into one
 */
function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ref as any).current = node;
      }
    }
  };
}

/**
 * Type guard for element with id
 */
function hasId(element: unknown): element is ElementWithId {
  return (
    typeof element === 'object' &&
    element !== null &&
    'id' in element &&
    typeof (element as ElementWithId).id === 'string' &&
    (element as ElementWithId).id.length > 0
  );
}

/**
 * DraggableInner - The actual React component with hooks
 * 
 * This is rendered INSIDE the Plate node context, so hooks work correctly.
 * Hooks are ALWAYS called (no conditional).
 */
function DraggableInner({
  element,
  children,
}: {
  element: ElementWithId;
  children: React.ReactNode;
}) {
  // Hooks ALWAYS called - no conditions before this
  const { isDragging, previewRef, handleRef } = useDraggable({ element });
  const { dropLine } = useDropLine({ id: element.id });

  // Attach previewRef to the actual node DOM via cloneElement
  const onlyChild = React.Children.only(children) as React.ReactElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingRef = (onlyChild as any).ref;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const composedRef = mergeRefs<any>(existingRef, previewRef as any);

  const child = React.cloneElement(onlyChild, {
    ref: composedRef,
    className: [
      onlyChild.props.className,
      isDragging ? 'slate-dnd-dragging' : null,
    ]
      .filter(Boolean)
      .join(' '),
  });

  return (
    <div className="slate-block-wrapper" style={{ position: 'relative' }}>
      {/* Drag handle (⋮⋮) - visible on hover via CSS */}
      <div
        className="slate-drag-handle"
        contentEditable={false}
        style={{
          position: 'absolute',
          left: '-40px',
          top: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
        }}
      >
        {/* Add button (+) */}
        <button
          type="button"
          className="slate-add-button"
          contentEditable={false}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // TODO: Open slash menu at this block
          }}
          aria-label="Add block"
          style={{
            width: '18px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'rgba(55, 53, 47, 0.4)',
            fontSize: '18px',
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          +
        </button>
        {/* Drag handle (⋮⋮) */}
        <button
          type="button"
          ref={handleRef}
          data-drag-handle
          contentEditable={false}
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Drag block"
          style={{
            width: '18px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            borderRadius: '4px',
            cursor: 'grab',
            color: 'rgba(55, 53, 47, 0.4)',
          }}
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="7" r="1.5" />
            <circle cx="8" cy="7" r="1.5" />
            <circle cx="2" cy="12" r="1.5" />
            <circle cx="8" cy="12" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Drop line indicator */}
      {dropLine && (
        <div
          className={`slate-drop-line slate-drop-line--${dropLine}`}
          contentEditable={false}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: 'rgb(35, 131, 226)',
            pointerEvents: 'none',
            zIndex: 20,
            ...(dropLine === 'top' ? { top: '-1px' } : { bottom: '-1px' }),
          }}
        />
      )}

      {/* The actual node with previewRef attached */}
      {child}
    </div>
  );
}

/**
 * BlockDraggable - Factory function for render.aboveNodes
 * 
 * NO HOOKS HERE - this is a factory, not a component.
 * Conditions are OK here because no hooks are called.
 * 
 * Returns undefined for non-root blocks (no wrapper needed).
 * Returns a wrapper function for root blocks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BlockDraggable = ({ element, path }: { element: any; path?: number[] }) => {
  // Conditions are OK here - NO HOOKS in this function
  const isRootBlock = path?.length === 1;
  if (!isRootBlock) return undefined;
  if (!hasId(element)) return undefined;

  // Return wrapper function that renders DraggableInner
  return ({ children }: { children: React.ReactNode }) => (
    <DraggableInner element={element}>{children}</DraggableInner>
  );
};

export default BlockDraggable;
