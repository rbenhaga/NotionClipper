/**
 * withDraggable - HOC to add DnD to Plate element components
 * 
 * This HOC wraps element components to add drag handles and drop indicators.
 * The hooks are called INSIDE the component (in Plate's node context).
 * 
 * Key: We use useElement() from Plate to get the element in context,
 * NOT the element prop directly.
 */

import React, { forwardRef } from 'react';
import type { PlateElementProps } from '@udecode/plate/react';
import { useElement } from '@udecode/plate/react';
import { useDraggable, useDropLine } from '@udecode/plate-dnd';
import type { TElement } from '@udecode/plate';

// Element with id for DnD
type ElementWithId = TElement & { id: string };

/**
 * Check if element has a valid id
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
 * DragHandle component - renders the ⋮⋮ and + buttons
 */
function DragHandle({ handleRef }: { handleRef: React.Ref<HTMLButtonElement> }) {
  return (
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
  );
}

/**
 * DropLine component - renders the blue drop indicator
 */
function DropLine({ direction }: { direction: 'top' | 'bottom' }) {
  return (
    <div
      className={`slate-drop-line slate-drop-line--${direction}`}
      contentEditable={false}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: '2px',
        backgroundColor: 'rgb(35, 131, 226)',
        pointerEvents: 'none',
        zIndex: 20,
        ...(direction === 'top' ? { top: '-1px' } : { bottom: '-1px' }),
      }}
    />
  );
}

/**
 * withDraggable HOC - adds DnD to a Plate element component
 * 
 * Usage: const DraggableParagraph = withDraggable(ParagraphElement);
 */
export function withDraggable<P extends PlateElementProps>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const DraggableComponent = forwardRef<HTMLElement, P>((props, ref) => {
    // Get element from Plate's context (this is the key!)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let element: any;
    try {
      element = useElement();
    } catch {
      // If useElement fails, render without DnD
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <Component {...(props as any)} />;
    }

    // Check if element has id (required for DnD)
    if (!hasId(element)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <Component {...(props as any)} />;
    }

    // Now we can safely use DnD hooks - we're in Plate's context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { isDragging, previewRef, handleRef } = useDraggable({ element: element as any });
    const { dropLine } = useDropLine({ id: element.id });

    // Merge refs
    const mergedRef = (node: HTMLElement | null) => {
      // Forward to previewRef
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pRef = previewRef as any;
      if (typeof pRef === 'function') {
        pRef(node);
      } else if (pRef && 'current' in pRef) {
        pRef.current = node;
      }
      // Forward to external ref
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && 'current' in ref) {
        (ref as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    };

    // Only show drop line for top/bottom
    const showDropLine = dropLine === 'top' || dropLine === 'bottom';

    return (
      <div 
        className={`slate-block-wrapper ${isDragging ? 'slate-dnd-dragging' : ''}`}
        style={{ position: 'relative' }}
      >
        <DragHandle handleRef={handleRef} />
        {showDropLine && <DropLine direction={dropLine as 'top' | 'bottom'} />}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Component {...(props as any)} ref={mergedRef} />
      </div>
    );
  });

  DraggableComponent.displayName = `Draggable(${Component.displayName || Component.name || 'Component'})`;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return DraggableComponent as any;
}

/**
 * withDraggables - apply withDraggable to multiple components
 */
export function withDraggables<T extends Record<string, React.ComponentType<PlateElementProps>>>(
  components: T,
  draggableKeys: (keyof T)[]
): T {
  const result = { ...components };
  
  for (const key of draggableKeys) {
    if (result[key]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result[key] = withDraggable(result[key] as any) as any;
    }
  }
  
  return result;
}

export default withDraggable;
