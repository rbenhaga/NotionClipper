/**
 * FormattingMenu - Menu de formatage contextuel style Notion enrichi
 * S'affiche lors de la sélection de texte ou du clic droit
 * Inclut le changement de type de bloc
 */

import { useState, useEffect, useRef } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Code, Link,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, CheckSquare, Sparkles, MoreHorizontal, Type,
  Minus, AlertCircle, Hash, ArrowRight
} from 'lucide-react';

export interface FormattingMenuProps {
  show: boolean;
  position: { x: number; y: number };
  onFormat: (format: FormattingAction) => void;
  onClose: () => void;
}

export type FormattingAction =
  | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link'
  | 'heading1' | 'heading2' | 'heading3'
  | 'bulletList' | 'numberedList' | 'todo'
  | 'quote' | 'callout' | 'divider'
  | 'paragraph' | 'toggleList';

interface FormatButton {
  action: FormattingAction;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

const formatButtons: FormatButton[] = [
  { action: 'bold', icon: <Bold size={14} />, label: 'Gras', shortcut: '⌘B' },
  { action: 'italic', icon: <Italic size={14} />, label: 'Italique', shortcut: '⌘I' },
  { action: 'underline', icon: <Underline size={14} />, label: 'Souligné', shortcut: '⌘U' },
  { action: 'strikethrough', icon: <Strikethrough size={14} />, label: 'Barré' },
  { action: 'code', icon: <Code size={14} />, label: 'Code', shortcut: '⌘E' },
  { action: 'link', icon: <Link size={14} />, label: 'Lien', shortcut: '⌘K' },
];

interface BlockTypeOption {
  action: FormattingAction;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const blockTypeOptions: BlockTypeOption[] = [
  { action: 'paragraph', icon: <Type size={16} />, label: 'Texte', description: 'Paragraphe simple' },
  { action: 'heading1', icon: <Heading1 size={16} />, label: 'Titre 1', description: 'Grand titre de section' },
  { action: 'heading2', icon: <Heading2 size={16} />, label: 'Titre 2', description: 'Titre moyen' },
  { action: 'heading3', icon: <Heading3 size={16} />, label: 'Titre 3', description: 'Petit titre' },
  { action: 'bulletList', icon: <List size={16} />, label: 'Liste à puces', description: 'Liste non ordonnée' },
  { action: 'numberedList', icon: <ListOrdered size={16} />, label: 'Liste numérotée', description: 'Liste ordonnée' },
  { action: 'todo', icon: <CheckSquare size={16} />, label: 'Liste de tâches', description: 'Cases à cocher' },
  { action: 'quote', icon: <Quote size={16} />, label: 'Citation', description: 'Bloc de citation' },
  { action: 'callout', icon: <AlertCircle size={16} />, label: 'Callout', description: 'Encadré avec icône' },
  { action: 'divider', icon: <Minus size={16} />, label: 'Séparateur', description: 'Ligne horizontale' },
];

export function FormattingMenu({ show, position, onFormat, onClose }: FormattingMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showBlockTypes, setShowBlockTypes] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!show) {
      setShowBlockTypes(false);
      return;
    }

    // Calculate menu position to stay within viewport
    const updatePosition = () => {
      const menuWidth = showBlockTypes ? 280 : 240;
      const menuHeight = showBlockTypes ? 400 : 48;
      
      let x = position.x;
      let y = position.y;

      // Adjust horizontal position
      if (x + menuWidth / 2 > window.innerWidth) {
        x = window.innerWidth - menuWidth / 2 - 10;
      }
      if (x - menuWidth / 2 < 0) {
        x = menuWidth / 2 + 10;
      }

      // Adjust vertical position
      if (y - menuHeight - 8 < 0) {
        // Show below selection instead
        setMenuStyle({
          left: `${x}px`,
          top: `${y + 30}px`,
          transform: 'translateX(-50%)',
        });
      } else {
        setMenuStyle({
          left: `${x}px`,
          top: `${y}px`,
          transform: 'translateY(-100%) translateY(-8px) translateX(-50%)',
        });
      }
    };

    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showBlockTypes) {
          setShowBlockTypes(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [show, position, onClose, showBlockTypes]);

  if (!show) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-[#2d2d2d] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={menuStyle}
    >
      {!showBlockTypes ? (
        // Main formatting menu
        <div className="flex items-center divide-x divide-gray-200 dark:divide-gray-700">
          {/* Format buttons */}
          <div className="flex items-center p-1 gap-0.5">
            {formatButtons.map(({ action, icon, label, shortcut }) => (
              <button
                key={action}
                onClick={() => {
                  onFormat(action);
                  onClose();
                }}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Block type button */}
          <div className="p-1">
            <button
              onClick={() => setShowBlockTypes(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors text-xs font-medium"
              title="Changer le type de bloc"
            >
              <Hash size={14} />
              <span>Type</span>
              <ArrowRight size={12} className="opacity-50" />
            </button>
          </div>

          {/* More button */}
          <div className="p-1">
            <button
              onClick={() => setShowBlockTypes(true)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              title="Plus d'options"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
      ) : (
        // Block types panel
        <div className="w-64">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowBlockTypes(false)}
              className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowRight size={12} className="rotate-180" />
              <span>Retour</span>
            </button>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
              Transformer en
            </h3>
          </div>

          {/* Block type options */}
          <div className="py-1 max-h-80 overflow-y-auto">
            {blockTypeOptions.map(({ action, icon, label, description }) => (
              <button
                key={action}
                onClick={() => {
                  onFormat(action);
                  onClose();
                }}
                className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
