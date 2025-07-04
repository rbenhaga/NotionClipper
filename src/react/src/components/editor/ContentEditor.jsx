// src/react/src/components/editor/ContentEditor.jsx
import React, { useState, useEffect } from 'react';
import { 
  Type, 
  Code, 
  Image, 
  Link, 
  Table, 
  FileText,
  Hash,
  Calendar,
  Globe,
  Tag,
  Folder,
  ChevronDown,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import ContentPreview from './ContentPreview';
import MetadataEditor from './MetadataEditor';

export default function ContentEditor({
  content,
  editedContent,
  contentType,
  metadata,
  onContentChange,
  onContentTypeChange,
  onMetadataChange,
  onSend,
  sending = false,
  selectedPage = null,
  multiSelectMode = false,
  selectedPagesCount = 0
}) {
  const [showPreview, setShowPreview] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const [position, setPosition] = useState('append');

  // Définir les types de contenu disponibles
  const contentTypes = [
    { id: 'text', label: 'Texte', icon: Type },
    { id: 'markdown', label: 'Markdown', icon: FileText },
    { id: 'code', label: 'Code', icon: Code },
    { id: 'url', label: 'URL', icon: Link },
    { id: 'image', label: 'Image', icon: Image },
    { id: 'table', label: 'Table', icon: Table }
  ];

  const isValid = editedContent && editedContent.trim() !== '';
  const canSend = isValid && (selectedPage || (multiSelectMode && selectedPagesCount > 0));

  const handleSend = () => {
    if (canSend && !sending) {
      onSend({
        content: editedContent,
        contentType,
        position,
        ...metadata
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Barre d'outils */}
      <div className="border-b border-notion-gray-200 dark:border-notion-dark-border">
        {/* Type de contenu */}
        <div className="flex items-center gap-2 p-3">
          <div className="flex items-center gap-1 bg-notion-gray-50 dark:bg-notion-dark-hover rounded-lg p-1">
            {contentTypes.map(type => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => onContentTypeChange(type.id)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${contentType === type.id 
                      ? 'bg-white dark:bg-notion-dark-secondary text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-notion-gray-600 dark:text-notion-gray-400 hover:text-notion-gray-900 dark:hover:text-white'
                    }
                  `}
                  title={type.label}
                >
                  <Icon size={16} />
                  <span className="hidden md:inline">{type.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Position d'insertion */}
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="text-sm border border-notion-gray-200 dark:border-notion-dark-border rounded-lg px-3 py-1.5 bg-white dark:bg-notion-dark-secondary"
            >
              <option value="append">Ajouter à la fin</option>
              <option value="prepend">Ajouter au début</option>
            </select>

            {/* Toggle métadonnées */}
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`
                p-2 rounded-lg transition-colors
                ${showMetadata 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'hover:bg-notion-gray-100 dark:hover:bg-notion-dark-hover text-notion-gray-600 dark:text-notion-gray-400'
                }
              `}
              title="Métadonnées"
            >
              <Tag size={18} />
            </button>

            {/* Toggle preview */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`
                p-2 rounded-lg transition-colors
                ${showPreview 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'hover:bg-notion-gray-100 dark:hover:bg-notion-dark-hover text-notion-gray-600 dark:text-notion-gray-400'
                }
              `}
              title={showPreview ? 'Masquer l\'aperçu' : 'Afficher l\'aperçu'}
            >
              {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Métadonnées */}
        {showMetadata && (
          <MetadataEditor
            metadata={metadata}
            onChange={onMetadataChange}
          />
        )}
      </div>

      {/* Zone d'édition */}
      <div className={`flex-1 flex ${showPreview ? 'gap-0' : ''} min-h-0`}>
        {/* Éditeur */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col`}>
          <textarea
            value={editedContent || ''}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder={getPlaceholder(contentType)}
            className="flex-1 p-4 resize-none bg-white dark:bg-notion-dark-secondary text-notion-gray-900 dark:text-white focus:outline-none font-mono text-sm"
            spellCheck="false"
          />
        </div>

        {/* Aperçu */}
        {showPreview && (
          <>
            <div className="w-px bg-notion-gray-200 dark:bg-notion-dark-border" />
            <div className="w-1/2 overflow-y-auto">
              <ContentPreview
                content={editedContent}
                contentType={contentType}
              />
            </div>
          </>
        )}
      </div>

      {/* Barre d'envoi */}
      <div className="border-t border-notion-gray-200 dark:border-notion-dark-border p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-notion-gray-600 dark:text-notion-gray-400">
            {multiSelectMode ? (
              <span>
                {selectedPagesCount} page{selectedPagesCount > 1 ? 's' : ''} sélectionnée{selectedPagesCount > 1 ? 's' : ''}
              </span>
            ) : selectedPage ? (
              <span>
                Destination : <span className="font-medium">{selectedPage.title}</span>
              </span>
            ) : (
              <span>Sélectionnez une page</span>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!canSend || sending}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
              ${canSend && !sending
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' 
                : 'bg-notion-gray-200 dark:bg-notion-dark-hover text-notion-gray-400 dark:text-notion-gray-600 cursor-not-allowed'
              }
            `}
          >
            <Send size={16} />
            <span>
              {sending ? 'Envoi...' : multiSelectMode ? `Envoyer vers ${selectedPagesCount} pages` : 'Envoyer'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function getPlaceholder(contentType) {
  switch (contentType) {
    case 'markdown':
      return '# Titre\n\nÉcrivez votre contenu en **Markdown**...';
    case 'code':
      return '// Collez votre code ici\nfunction exemple() {\n  console.log("Hello World!");\n}';
    case 'url':
      return 'https://example.com';
    case 'table':
      return '| Colonne 1 | Colonne 2 |\n|-----------|----------|\n| Donnée 1  | Donnée 2  |';
    default:
      return 'Écrivez ou collez votre contenu ici...';
  }
}