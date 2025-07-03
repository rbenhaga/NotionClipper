import React, { useState, useEffect } from 'react';
import { 
  FileCode, AlertCircle, Image as ImageIcon, ExternalLink,
  Hash, List, ListOrdered, Quote, Minus, CheckSquare,
  ChevronRight, AlertTriangle, File
} from 'lucide-react';

const NotionPreview = ({ content, contentType = 'mixed', parseAsMarkdown = true }) => {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parseContent();
  }, [content, contentType, parseAsMarkdown]);

  // Validation des URLs d'images
  const isValidImageUrl = (url) => {
    // Extensions d'images valides
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const urlLower = url.toLowerCase();
    
    // Vérifier l'extension
    if (imageExtensions.some(ext => urlLower.includes(ext))) {
      // Mais exclure les pages web de stock photos
      const excludedDomains = ['shutterstock.com', 'gettyimages.com', 'istockphoto.com', 'adobe.com/stock'];
      if (excludedDomains.some(domain => urlLower.includes(domain))) {
        return false;
      }
      return true;
    }
    
    // Services d'images directs
    const validImageHosts = [
      'images.unsplash.com',
      'i.imgur.com',
      'i.ibb.co',
      'cdn.discordapp.com',
      'raw.githubusercontent.com'
    ];
    
    return validImageHosts.some(host => urlLower.includes(host));
  };

  const parseContent = async () => {
    if (!content) {
      setBlocks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const parsedBlocks = parseMarkdownToNotionBlocks(content);
      setBlocks(parsedBlocks);
    } catch (err) {
      console.error('Erreur parsing:', err);
      setBlocks([{
        type: 'error',
        message: 'Erreur lors du parsing du contenu'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const parseMarkdownToNotionBlocks = (text) => {
    const blocks = [];
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeContent = [];
    let codeLanguage = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Gestion des blocs de code
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim() || 'text';
          codeContent = [];
        } else {
          inCodeBlock = false;
          blocks.push({
            type: 'code',
            code: {
              rich_text: [{ type: 'text', text: { content: codeContent.join('\n') } }],
              language: codeLanguage
            }
          });
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }
      
      // Ignorer les lignes vides
      if (line.trim() === '') {
        continue;
      }
      
      // Images avec validation
      const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        const [_, altText, imageUrl] = imageMatch;
        
        if (isValidImageUrl(imageUrl)) {
          blocks.push({
            type: 'image',
            image: { 
              type: 'external', 
              external: { url: imageUrl },
              caption: altText ? [{ type: 'text', text: { content: altText } }] : []
            }
          });
        } else {
          // Créer un bloc d'erreur styled comme Notion
          blocks.push({
            type: 'image_error',
            url: imageUrl,
            altText: altText || 'Image',
            errorType: imageUrl.includes('shutterstock') ? 'stock_photo' : 'invalid_url'
          });
        }
        continue;
      }
      
      // Titres
      if (line.startsWith('# ')) {
        blocks.push({
          type: 'heading_1',
          heading_1: {
            rich_text: [{ type: 'text', text: { content: line.slice(2).trim() } }]
          }
        });
      } else if (line.startsWith('## ')) {
        blocks.push({
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: line.slice(3).trim() } }]
          }
        });
      } else if (line.startsWith('### ')) {
        blocks.push({
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: line.slice(4).trim() } }]
          }
        });
      }
      // Listes
      else if (line.match(/^[\*\-]\s+/)) {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: parseRichText(line.replace(/^[\*\-]\s+/, ''))
          }
        });
      }
      // Quotes
      else if (line.startsWith('> ')) {
        blocks.push({
          type: 'quote',
          quote: {
            rich_text: parseRichText(line.slice(2))
          }
        });
      }
      // Paragraphes
      else {
        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: parseRichText(line)
          }
        });
      }
    }
    
    return blocks;
  };

  const parseRichText = (text) => {
    const richText = [];
    let currentText = '';
    let i = 0;
    
    while (i < text.length) {
      // Code inline
      if (text[i] === '`') {
        if (currentText) {
          richText.push({ type: 'text', text: { content: currentText } });
          currentText = '';
        }
        
        let j = i + 1;
        while (j < text.length && text[j] !== '`') j++;
        
        if (j < text.length) {
          richText.push({
            type: 'text',
            text: { content: text.slice(i + 1, j) },
            annotations: { code: true }
          });
          i = j + 1;
          continue;
        }
      }
      
      // Gras **text**
      if (text.slice(i, i + 2) === '**') {
        if (currentText) {
          richText.push({ type: 'text', text: { content: currentText } });
          currentText = '';
        }
        
        let j = i + 2;
        while (j < text.length - 1 && text.slice(j, j + 2) !== '**') j++;
        
        if (j < text.length - 1) {
          richText.push({
            type: 'text',
            text: { content: text.slice(i + 2, j) },
            annotations: { bold: true }
          });
          i = j + 2;
          continue;
        }
      }
      
      // Italique *text*
      if (text[i] === '*' && text[i + 1] !== '*') {
        if (currentText) {
          richText.push({ type: 'text', text: { content: currentText } });
          currentText = '';
        }
        
        let j = i + 1;
        while (j < text.length && text[j] !== '*') j++;
        
        if (j < text.length) {
          richText.push({
            type: 'text',
            text: { content: text.slice(i + 1, j) },
            annotations: { italic: true }
          });
          i = j + 1;
          continue;
        }
      }
      
      currentText += text[i];
      i++;
    }
    
    if (currentText) {
      richText.push({ type: 'text', text: { content: currentText } });
    }
    
    return richText.length > 0 ? richText : [{ type: 'text', text: { content: '' } }];
  };

  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'paragraph':
        return (
          <div key={index} className="mb-2 text-base leading-relaxed text-gray-900">
            <RichText richText={block.paragraph.rich_text} />
          </div>
        );

      case 'heading_1':
        return (
          <h1 key={index} className="text-3xl font-semibold mb-4 mt-8 text-gray-900">
            <RichText richText={block.heading_1.rich_text} />
          </h1>
        );

      case 'heading_2':
        return (
          <h2 key={index} className="text-2xl font-semibold mb-3 mt-6 text-gray-900">
            <RichText richText={block.heading_2.rich_text} />
          </h2>
        );

      case 'heading_3':
        return (
          <h3 key={index} className="text-xl font-medium mb-2 mt-4 text-gray-900">
            <RichText richText={block.heading_3.rich_text} />
          </h3>
        );

      case 'bulleted_list_item':
        return (
          <div key={index} className="flex items-start mb-1 ml-0">
            <span className="mr-2 text-gray-400 select-none">•</span>
            <div className="flex-1">
              <RichText richText={block.bulleted_list_item.rich_text} />
            </div>
          </div>
        );

      case 'quote':
        return (
          <blockquote key={index} className="border-l-3 border-gray-900 pl-4 my-4">
            <div className="text-base leading-relaxed">
              <RichText richText={block.quote.rich_text} />
            </div>
          </blockquote>
        );

      case 'code':
        const language = block.code.language || 'text';
        const codeContent = block.code.rich_text[0]?.text?.content || '';
        
        return (
          <div key={index} className="my-4 relative group">
            <div className="bg-gray-100 rounded-md p-4 font-mono text-sm overflow-x-auto">
              <pre className="m-0">
                <code className="text-gray-800">{codeContent}</code>
              </pre>
              <div className="absolute top-2 right-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {language}
              </div>
            </div>
          </div>
        );

      case 'image':
        // Ne pas afficher d'image locale (file://)
        const url = block.image.external?.url;
        if (!url || url.startsWith('file://')) {
          return (
            <div key={url || index} className="my-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 text-center">
                Impossible d'afficher une image locale (file://)
              </div>
            </div>
          );
        }
        return (
          <div key={url || index} className="my-4">
            <img
              src={url}
              alt={block.image.caption?.[0]?.text?.content || 'Image'}
              className="max-w-full rounded-sm"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = `
                  <div class="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                    <div class="text-gray-400 mb-2">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="mx-auto">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                    <p class="text-sm text-gray-500">Impossible de charger l'image</p>
                  </div>
                `;
              }}
            />
            {block.image.caption?.length > 0 && (
              <p className="text-sm text-gray-500 mt-1 text-center">
                {block.image.caption[0].text.content}
              </p>
            )}
          </div>
        );

      case 'image_error':
        return (
          <div key={index} className="my-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-start">
                <AlertCircle className="text-red-500 mr-3 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    Image non supportée
                  </p>
                  {block.errorType === 'stock_photo' ? (
                    <p className="text-xs text-red-700 mb-2">
                      Les liens vers des pages de banques d'images ne sont pas supportés par Notion. 
                      Utilisez une URL directe vers le fichier image.
                    </p>
                  ) : (
                    <p className="text-xs text-red-700 mb-2">
                      L'URL fournie n'est pas une image valide pour Notion.
                    </p>
                  )}
                  <div className="mt-2 p-2 bg-white rounded border border-red-100">
                    <p className="text-xs text-gray-600 mb-1">URL tentée :</p>
                    <p className="text-xs font-mono text-gray-800 break-all">{block.url}</p>
                  </div>
                  <a 
                    href={block.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Ouvrir le lien
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const RichText = ({ richText }) => {
    if (!richText || richText.length === 0) return null;

    return (
      <>
        {richText.map((text, i) => {
          const annotations = text.annotations || {};
          const content = text.text?.content || '';

          let className = '';
          if (annotations.bold) className += 'font-semibold ';
          if (annotations.italic) className += 'italic ';
          if (annotations.code) className += 'px-1 py-0.5 bg-gray-100 rounded text-sm font-mono text-red-600 ';

          return (
            <span key={i} className={className.trim()}>
              {content}
            </span>
          );
        })}
      </>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="notion-preview">
      {/* Barre de titre Notion simulée */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <File size={16} />
          <span>Aperçu Notion</span>
          <span className="text-gray-300">•</span>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
            Mode prévisualisation
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-3xl" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
        {blocks.length === 0 ? (
          <div className="text-gray-400 italic">
            Commencez à taper pour voir l'aperçu...
          </div>
        ) : (
          blocks.map((block, index) => renderBlock(block, index))
        )}
      </div>

      {/* Message d'avertissement */}
      {blocks.some(b => b.type === 'image_error') && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="text-amber-600 mr-2 mt-0.5" size={16} />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Problèmes détectés</p>
              <p className="text-xs">
                Certaines images ne pourront pas être envoyées vers Notion. 
                Utilisez des URLs directes vers des fichiers image (.jpg, .png, etc.) 
                ou configurez ImgBB pour uploader automatiquement vos images.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Ajout d'un ErrorBoundary simple
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // Log possible ici
  }
  render() {
    if (this.state.hasError) {
      return <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">Une erreur est survenue dans la prévisualisation.</div>;
    }
    return this.props.children;
  }
}

// Remplacer l'export principal par un wrapper ErrorBoundary
const NotionPreviewWithBoundary = (props) => (
  <ErrorBoundary>
    <NotionPreview {...props} />
  </ErrorBoundary>
);
export default NotionPreviewWithBoundary;