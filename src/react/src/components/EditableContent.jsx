// src/react/src/components/EditableContent.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Type, Code, Image, Video, Music, Link, Table, 
  FileText, Eye, Edit3, Check, X, Wand2, 
  ChevronDown, ChevronUp, Plus, Trash2, Copy
} from 'lucide-react';
import NotionPreview from './NotionPreview';

/**
 * Interface d'édition avancée permettant de :
 * - Voir et éditer tout le contenu avec syntaxe Markdown/HTML visible
 * - Basculer entre vue édition et prévisualisation
 * - Insérer des templates de contenu
 * - Détecter et convertir automatiquement les types
 */
const EditableContent = ({ 
  initialContent = '', 
  contentType = 'mixed',
  onContentChange,
  onTypeChange,
  onSend 
}) => {
  const [content, setContent] = useState(initialContent);
  const [selectedType, setSelectedType] = useState(contentType);
  const [viewMode, setViewMode] = useState('split'); // 'edit', 'preview', 'split'
  const [showTemplates, setShowTemplates] = useState(false);
  const [autoDetectType, setAutoDetectType] = useState(true);
  const [detectedTypes, setDetectedTypes] = useState({});
  const textareaRef = useRef(null);

  // Templates de contenu prédéfinis
  const contentTemplates = {
    markdown: {
      title: 'Article Markdown',
      icon: FileText,
      content: `# Titre principal

## Introduction
Voici un paragraphe d'introduction avec **du texte en gras** et *en italique*.

### Points clés
- Premier point important
- Deuxième point avec [un lien](https://example.com)
- Troisième point avec \`code inline\`

## Code exemple
\`\`\`javascript
function exemple() {
  console.log("Hello World!");
}
\`\`\`

## Image
![Description de l'image](https://via.placeholder.com/600x400)

> 💡 **Note**: Ceci est une citation importante.`
    },
    
    table: {
      title: 'Tableau',
      icon: Table,
      content: `| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Donnée A1 | Donnée A2 | Donnée A3 |
| Donnée B1 | Donnée B2 | Donnée B3 |
| Donnée C1 | Donnée C2 | Donnée C3 |`
    },
    
    code: {
      title: 'Bloc de code',
      icon: Code,
      content: `\`\`\`python
def fibonacci(n):
    """Calcule le n-ième nombre de Fibonacci"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Exemple d'utilisation
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
\`\`\``
    },
    
    media: {
      title: 'Média mixte',
      icon: Image,
      content: `## Galerie média

### Image
![Photo de paysage](https://images.unsplash.com/photo-1506905925346-21bda4d32df4)

### Vidéo YouTube
https://www.youtube.com/watch?v=dQw4w9WgXcQ

### Tweet
https://twitter.com/notion/status/1234567890

### Audio (lien)
[Écouter le podcast](https://example.com/audio.mp3)`
    },
    
    checklist: {
      title: 'Liste de tâches',
      icon: Check,
      content: `## Ma liste de tâches

- [ ] Tâche non complétée
- [x] Tâche complétée
- [ ] Autre tâche à faire
  - [ ] Sous-tâche 1
  - [ ] Sous-tâche 2
- [x] Tâche terminée avec succès`
    }
  };

  // Types de contenu disponibles
  const contentTypes = [
    { id: 'mixed', label: 'Auto-détection', icon: Wand2, color: 'purple' },
    { id: 'text', label: 'Texte simple', icon: Type, color: 'gray' },
    { id: 'markdown', label: 'Markdown', icon: FileText, color: 'blue' },
    { id: 'code', label: 'Code', icon: Code, color: 'green' },
    { id: 'image', label: 'Image', icon: Image, color: 'pink' },
    { id: 'video', label: 'Vidéo', icon: Video, color: 'red' },
    { id: 'table', label: 'Tableau', icon: Table, color: 'indigo' },
    { id: 'url', label: 'Lien/Bookmark', icon: Link, color: 'cyan' }
  ];

  useEffect(() => {
    if (autoDetectType && content) {
      analyzeContent();
    }
  }, [content, autoDetectType]);

  const analyzeContent = async () => {
    try {
      const response = await fetch('/api/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      if (response.ok) {
        const data = await response.json();
        setDetectedTypes(data.types || {});
        
        if (autoDetectType && data.suggestedType) {
          setSelectedType(data.suggestedType);
        }
      }
    } catch (error) {
      console.error('Erreur analyse:', error);
    }
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  const handleTypeChange = (newType) => {
    setSelectedType(newType);
    setAutoDetectType(newType === 'mixed');
    if (onTypeChange) {
      onTypeChange(newType);
    }
  };

  const insertTemplate = (template) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = 
        content.substring(0, start) + 
        template.content + 
        content.substring(end);
      
      handleContentChange(newContent);
      
      // Restaurer le focus et la position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + template.content.length,
          start + template.content.length
        );
      }, 0);
    }
  };

  const insertAtCursor = (text) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = 
        content.substring(0, start) + 
        text + 
        content.substring(end);
      
      handleContentChange(newContent);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    }
  };

  // Raccourcis d'insertion rapide
  const quickInserts = [
    { label: 'Gras', insert: '**texte**', icon: 'B' },
    { label: 'Italique', insert: '*texte*', icon: 'I' },
    { label: 'Code', insert: '`code`', icon: '<>' },
    { label: 'Lien', insert: '[texte](url)', icon: '🔗' },
    { label: 'Image', insert: '![alt](url)', icon: '🖼️' },
    { label: 'Citation', insert: '> citation', icon: '"' },
    { label: 'Liste', insert: '- élément', icon: '•' },
    { label: 'Titre', insert: '## Titre', icon: 'H' }
  ];

  return (
    <div className="editable-content-container h-full flex flex-col">
      {/* Barre d'outils */}
      <div className="toolbar bg-gray-50 border-b p-3 space-y-3">
        {/* Sélection du type */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Type :</span>
          <div className="flex flex-wrap gap-2">
            {contentTypes.map(type => (
              <button
                key={type.id}
                onClick={() => handleTypeChange(type.id)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  flex items-center gap-1.5
                  ${selectedType === type.id
                    ? `bg-${type.color}-100 text-${type.color}-700 ring-2 ring-${type.color}-500`
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <type.icon size={14} />
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Boutons d'action et vue */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Insertions rapides */}
            {quickInserts.map((item, i) => (
              <button
                key={i}
                onClick={() => insertAtCursor(item.insert)}
                className="p-1.5 text-sm hover:bg-gray-200 rounded"
                title={item.label}
              >
                {item.icon}
              </button>
            ))}
            
            <div className="h-4 w-px bg-gray-300 mx-1" />
            
            {/* Templates */}
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1.5 text-sm bg-white hover:bg-gray-100 
                       rounded-lg flex items-center gap-1.5"
            >
              <Plus size={14} />
              Templates
              <ChevronDown size={14} className={`transform transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Modes de vue */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded ${viewMode === 'edit' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title="Édition seule"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded ${viewMode === 'split' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title="Vue partagée"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="6" height="12" rx="1" />
                <rect x="9" y="2" width="6" height="12" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded ${viewMode === 'preview' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title="Prévisualisation seule"
            >
              <Eye size={16} />
            </button>
          </div>
        </div>

        {/* Templates dropdown */}
        {showTemplates && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t">
            {Object.entries(contentTemplates).map(([key, template]) => (
              <button
                key={key}
                onClick={() => {
                  insertTemplate(template);
                  setShowTemplates(false);
                }}
                className="p-3 bg-white hover:bg-gray-50 rounded-lg border 
                         flex items-center gap-2 text-left transition-colors"
              >
                <template.icon size={18} className="text-gray-600" />
                <span className="text-sm font-medium">{template.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Indicateur de types détectés */}
        {Object.keys(detectedTypes).length > 0 && selectedType === 'mixed' && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Détecté :</span>
            {Object.entries(detectedTypes).map(([type, count]) => (
              <span key={type} className="px-2 py-0.5 bg-gray-200 rounded">
                {type} ({count})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Zone de contenu */}
      <div className="flex-1 flex overflow-hidden">
        {/* Éditeur */}
        {viewMode !== 'preview' && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} 
                          flex flex-col border-r`}>
            <div className="p-2 bg-gray-100 border-b">
              <h3 className="text-sm font-medium text-gray-700">
                Éditeur - Markdown/HTML visible
              </h3>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none"
              placeholder={`Entrez votre contenu ici...
              
Formats supportés :
- **Gras** et *italique*
- # Titres (h1-h3)
- [Liens](url) et ![Images](url)
- \`\`\`code\`\`\` (avec langage)
- Tables avec | pipes |
- URLs YouTube/Vimeo
- Et plus encore...`}
            />
          </div>
        )}

        {/* Prévisualisation */}
        {viewMode !== 'edit' && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} 
                          flex flex-col`}>
            <div className="p-2 bg-gray-100 border-b">
              <h3 className="text-sm font-medium text-gray-700">
                Prévisualisation Notion
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <NotionPreview 
                content={content}
                contentType={selectedType}
                parseAsMarkdown={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Barre d'actions */}
      <div className="border-t p-3 bg-gray-50 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {content.length} caractères
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(content)}
            className="px-3 py-1.5 text-sm bg-white hover:bg-gray-100 
                     rounded-lg flex items-center gap-1.5"
          >
            <Copy size={14} />
            Copier
          </button>
          
          <button
            onClick={() => handleContentChange('')}
            className="px-3 py-1.5 text-sm bg-white hover:bg-gray-100 
                     rounded-lg flex items-center gap-1.5 text-red-600"
          >
            <Trash2 size={14} />
            Effacer
          </button>
          
          <button
            onClick={() => onSend && onSend(content, selectedType)}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white 
                     hover:bg-blue-700 rounded-lg flex items-center gap-1.5"
          >
            Envoyer vers Notion
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditableContent;