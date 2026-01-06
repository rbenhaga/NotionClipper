/**
 * Paragraph Element - Plate v52 component
 * 
 * IMPORTANT: Le ListPlugin de @platejs/list gère le rendu des listes via
 * render.belowNodes qui enveloppe les éléments dans <ol>/<ul> + <li>.
 * 
 * Ce composant NE DOIT PAS ajouter de styles de liste (display: list-item, 
 * listStyleType) car cela créerait des DOUBLES BULLETS.
 * 
 * Pour les todos (checked), on gère manuellement car ListPlugin ne le fait pas.
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

export function ParagraphElement(props: PlateElementProps) {
  const { element, children, ...rest } = props;
  
  // Récupérer les propriétés
  const indent = (element as any).indent as number | undefined;
  const listStyleType = (element as any).listStyleType as string | undefined;
  const checked = (element as any).checked as boolean | undefined;
  
  // Style de base
  const baseStyle: React.CSSProperties = {
    margin: 0,
    padding: '3px 0',
  };
  
  // Si c'est un todo (checkbox) - ListPlugin utilise listStyleType: 'todo'
  // Note: ListPlugin gère le wrapper <ul>/<li> mais pas la checkbox
  if (listStyleType === 'todo' || (checked !== undefined && listStyleType)) {
    return (
      <PlateElement
        {...rest}
        element={element}
        as="div"
        className="slate-selectable slate-todo-item"
        style={{
          ...baseStyle,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          // Pas de paddingLeft ici - ListPlugin gère l'indentation via le wrapper
        }}
      >
        <TodoCheckbox 
          checked={checked ?? false} 
          element={element} 
          editor={(rest as any).editor}
        />
        <span style={(checked ?? false) ? { opacity: 0.6, textDecoration: 'line-through', flex: 1 } : { flex: 1 }}>
          {children}
        </span>
      </PlateElement>
    );
  }
  
  // Si c'est un élément de liste (ListPlugin gère le rendu via belowNodes)
  // On ajoute juste un padding pour l'indentation visuelle
  if (listStyleType && indent) {
    return (
      <PlateElement
        {...rest}
        element={element}
        as="div"
        className="slate-selectable"
        style={baseStyle}
      >
        {children}
      </PlateElement>
    );
  }
  
  // Paragraphe normal
  return (
    <PlateElement
      {...rest}
      element={element}
      as="p"
      className="slate-selectable"
      style={baseStyle}
    >
      {children}
    </PlateElement>
  );
}

// Composant checkbox pour les todos
function TodoCheckbox({ 
  checked, 
  element, 
  editor 
}: { 
  checked: boolean; 
  element: any; 
  editor: any;
}) {
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (editor?.tf?.setNodes && editor?.api?.findPath) {
        const path = editor.api.findPath(element);
        if (path) {
          editor.tf.setNodes({ checked: !checked }, { at: path });
        }
      }
    } catch (err) {
      console.warn('[TodoCheckbox] Failed to toggle:', err);
    }
  };

  return (
    <button
      type="button"
      contentEditable={false}
      onMouseDown={handleToggle}
      style={{
        marginTop: '4px',
        width: '16px',
        height: '16px',
        border: '1px solid rgba(55, 53, 47, 0.16)',
        borderRadius: '3px',
        background: checked ? 'rgb(35, 131, 226)' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'white',
        padding: 0,
      }}
      aria-label={checked ? 'Uncheck' : 'Check'}
    >
      {checked && (
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

export default ParagraphElement;
