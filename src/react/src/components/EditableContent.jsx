// src/react/src/components/EditableContent.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Type, Code, Image, Video, Music, Link, Table, 
  FileText, Eye, Edit3, Check, X, Wand2, 
  ChevronDown, ChevronUp, Plus, Trash2, Copy,
  Bold, Italic, Quote, List, Hash, Link2,
  CheckSquare, Minus, CodeSquare
} from 'lucide-react';
import NotionPreview from './NotionPreview';

const EditableContent = ({ 
  initialContent = '', 
  contentType = 'mixed',
  onContentChange,
  onTypeChange,
  onSend 
}) => {
  const [content, setContent] = useState(initialContent);
  const [selectedType, setSelectedType] = useState(contentType);
  const [viewMode, setViewMode] = useState('split');
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

### Image avec lien direct
![Photo de paysage](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800)

### Vidéo YouTube
Intégrez une vidéo YouTube :
https://www.youtube.com/watch?v=dQw4w9WgXcQ

### Lien web
[Visitez notre site](https://example.com)

### Document
[📄 Télécharger le PDF](https://example.com/document.pdf)`
    },
    
    checklist: {
      title: 'Liste de tâches',
      icon: CheckSquare,
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

  // Gérer la touche Enter pour passer à la ligne
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      // Ctrl+Enter pour envoyer
      e.preventDefault();
      if (onSend) {
        onSend(content, selectedType);
      }
    }
    // Enter seul passe à la ligne (comportement par défaut)
  };

  // Raccourcis d'insertion rapide
  const quickInserts = [
    { label: 'Gras', insert: '**texte**', icon: <Bold size={14} /> },
    { label: 'Italique', insert: '*texte*', icon: <Italic size={14} /> },
    { label: 'Code', insert: '`code`', icon: <CodeSquare size={14} /> },
    { label: 'Lien', insert: '[texte](url)', icon: <Link2 size={14} /> },
    { label: 'Image', insert: '![alt](url)', icon: <Image size={14} /> },
    { label: 'Citation', insert: '> citation', icon: <Quote size={14} /> },
    { label: 'Liste', insert: '- élément', icon: <List size={14} /> },
    { label: 'Titre', insert: '## Titre', icon: <Hash size={14} /> },
    { label: 'Tâche', insert: '- [ ] tâche', icon: <CheckSquare size={14} /> },
    { label: 'Ligne', insert: '---', icon: <Minus size={14} /> }
  ];

  return (
    <div className="editable-content-container h-full flex flex-col bg-gray-50">
      {/* Barre d'outils */}
      <div className="toolbar bg-white border-b shadow-sm p-3 space-y-3">
        {/* Sélection du type */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Type de contenu :</span>
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
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <div className="flex items-center gap-1">
            {/* Insertions rapides */}
            {quickInserts.map((item, i) => (
              <button
                key={i}
                onClick={() => insertAtCursor(item.insert)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title={item.label}
              >
                {item.icon}
              </button>
            ))}
            
            <div className="h-6 w-px bg-gray-300 mx-1" />
            
            {/* Templates */}
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 
                       rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} />
              Templates
              <ChevronDown size={14} className={`transform transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Modes de vue */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'edit' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Édition seule"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'split' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Vue partagée"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="6" height="12" rx="1" />
                <rect x="9" y="2" width="6" height="12" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'preview' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Prévisualisation seule"
            >
              <Eye size={16} />
            </button>
          </div>
        </div>

        {/* Templates dropdown */}
        {showTemplates && (
          <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-lg">
            {Object.entries(contentTemplates).map(([key, template]) => (
              <button
                key={key}
                onClick={() => {
                  insertTemplate(template);
                  setShowTemplates(false);
                }}
                className="p-3 bg-white hover:bg-blue-50 rounded-lg text-left 
                         transition-colors border hover:border-blue-300"
              >
                <div className="flex items-center gap-2 mb-1">
                  <template.icon size={16} className="text-blue-600" />
                  <span className="font-medium text-sm">{template.title}</span>
                </div>
                <p className="text-xs text-gray-600">
                  Insérer un template {template.title.toLowerCase()}
                </p>
              </button>
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
                Éditeur - <span className="text-xs text-gray-500">Ctrl+Enter pour envoyer</span>
              </h3>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none bg-white"
              placeholder={`Collez ou tapez votre contenu ici...

Formats supportés :
- **gras** et *italique*
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
                          flex flex-col bg-white`}>
            <div className="p-2 bg-gray-100 border-b">
              <h3 className="text-sm font-medium text-gray-700">
                Prévisualisation Notion
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
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
      <div className="border-t p-3 bg-white flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {content.length} caractères
          {detectedTypes.hasMarkdown && (
            <span className="ml-2 text-blue-600">• Markdown détecté</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(content)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 
                     rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Copy size={14} />
            Copier
          </button>
          
          <button
            onClick={() => handleContentChange('')}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 
                     rounded-lg flex items-center gap-1.5 text-red-600 transition-colors"
          >
            <Trash2 size={14} />
            Effacer
          </button>
          
          <button
            onClick={() => onSend && onSend(content, selectedType)}
            className="px-4 py-2 text-sm bg-blue-600 text-white 
                     hover:bg-blue-700 rounded-lg flex items-center gap-1.5 
                     transition-colors shadow-sm hover:shadow-md"
          >
            Envoyer vers Notion
            <span className="text-xs opacity-75">(Ctrl+Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditableContent;