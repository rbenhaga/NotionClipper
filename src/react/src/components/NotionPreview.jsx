// src/react/src/components/NotionPreview.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileCode, AlertCircle, Image as ImageIcon, ExternalLink,
  Hash, List, ListOrdered, Quote, Minus, CheckSquare,
  ChevronRight, AlertTriangle, File, Video, Link2,
  Globe, Youtube, FileText, Calendar
} from 'lucide-react';

const NotionPreview = ({ content, contentType = 'mixed', parseAsMarkdown = true }) => {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parseContent();
  }, [content, contentType, parseAsMarkdown]);

  // Validation des URLs d'images améliorée
  const isValidImageUrl = (url) => {
    if (!url) return false;
    
    // Extensions d'images valides
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const urlLower = url.toLowerCase();
    
    // Vérifier si c'est une data URL
    if (urlLower.startsWith('data:image/')) {
      return true;
    }
    
    // Services d'images directs reconnus
    const validImageHosts = [
      'images.unsplash.com',
      'i.imgur.com',
      'i.ibb.co',
      'cdn.discordapp.com',
      'raw.githubusercontent.com',
      'user-images.githubusercontent.com',
      'cdn.jsdelivr.net',
      'i.redd.it',
      'pbs.twimg.com',
      'media.giphy.com'
    ];
    
    // Vérifier si c'est un service connu
    if (validImageHosts.some(host => urlLower.includes(host))) {
      return true;
    }
    
    // Vérifier l'extension dans l'URL
    const urlPath = url.split('?')[0].split('#')[0];
    if (imageExtensions.some(ext => urlPath.endsWith(ext))) {
      return true;
    }
    
    // Vérifier les paramètres d'URL pour certains services
    if (url.includes('unsplash.com') && url.includes('photo-')) {
      return true;
    }
    
    return false;
  };

  // Détection du type d'URL
  const detectUrlType = (url) => {
    const urlLower = url.toLowerCase();
    
    // YouTube
    if (urlLower.includes('youtube.com/watch') || urlLower.includes('youtu.be/')) {
      return 'youtube';
    }
    
    // Vimeo
    if (urlLower.includes('vimeo.com/')) {
      return 'vimeo';
    }
    
    // Twitter/X
    if (urlLower.includes('twitter.com/') || urlLower.includes('x.com/')) {
      return 'twitter';
    }
    
    // GitHub
    if (urlLower.includes('github.com/')) {
      return 'github';
    }
    
    // Google Docs/Sheets/Slides
    if (urlLower.includes('docs.google.com')) {
      return 'google-docs';
    }
    
    // Images
    if (isValidImageUrl(url)) {
      return 'image';
    }
    
    // Documents
    const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    if (docExtensions.some(ext => urlLower.includes(ext))) {
      return 'document';
    }
    
    return 'website';
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

  const parseRichText = (text) => {
    const elements = [];
    let remaining = text;
    
    // Patterns pour la détection
    const patterns = {
      bold: /\*\*([^*]+)\*\*/,
      italic: /\*([^*]+)\*/,
      code: /`([^`]+)`/,
      link: /\[([^\]]+)\]\(([^)]+)\)/,
      strikethrough: /~~([^~]+)~~/
    };
    
    while (remaining.length > 0) {
      let matched = false;
      
      // Chercher le premier match
      let earliestMatch = null;
      let earliestIndex = remaining.length;
      let matchType = null;
      
      for (const [type, pattern] of Object.entries(patterns)) {
        const match = remaining.match(pattern);
        if (match && match.index < earliestIndex) {
          earliestMatch = match;
          earliestIndex = match.index;
          matchType = type;
        }
      }
      
      if (earliestMatch) {
        // Ajouter le texte avant le match
        if (earliestIndex > 0) {
          elements.push({
            type: 'text',
            text: { content: remaining.substring(0, earliestIndex) }
          });
        }
        
        // Ajouter le match formaté
        switch (matchType) {
          case 'bold':
            elements.push({
              type: 'text',
              text: { content: earliestMatch[1] },
              annotations: { bold: true }
            });
            break;
          case 'italic':
            elements.push({
              type: 'text',
              text: { content: earliestMatch[1] },
              annotations: { italic: true }
            });
            break;
          case 'code':
            elements.push({
              type: 'text',
              text: { content: earliestMatch[1] },
              annotations: { code: true }
            });
            break;
          case 'strikethrough':
            elements.push({
              type: 'text',
              text: { content: earliestMatch[1] },
              annotations: { strikethrough: true }
            });
            break;
          case 'link':
            elements.push({
              type: 'text',
              text: { 
                content: earliestMatch[1],
                link: { url: earliestMatch[2] }
              }
            });
            break;
        }
        
        remaining = remaining.substring(earliestIndex + earliestMatch[0].length);
      } else {
        // Plus de matches, ajouter le reste
        elements.push({
          type: 'text',
          text: { content: remaining }
        });
        break;
      }
    }
    
    return elements.length > 0 ? elements : [{ type: 'text', text: { content: text } }];
  };

  const parseMarkdownToNotionBlocks = (text) => {
    const blocks = [];
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeContent = [];
    let codeLanguage = '';
    let inTable = false;
    let tableRows = [];
    
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
      
      // Gestion des tableaux
      if (line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        tableRows.push(line);
        
        // Vérifier si c'est la dernière ligne du tableau
        if (i === lines.length - 1 || !lines[i + 1].includes('|')) {
          blocks.push({
            type: 'table',
            tableRows: tableRows
          });
          inTable = false;
          tableRows = [];
        }
        continue;
      }
      
      // Ignorer les lignes vides
      if (line.trim() === '') {
        continue;
      }
      
      // Dividers
      if (line.match(/^[-*_]{3,}$/)) {
        blocks.push({ type: 'divider' });
        continue;
      }
      
      // URL seule sur une ligne
      if (line.match(/^https?:\/\/\S+$/)) {
        const url = line.trim();
        const urlType = detectUrlType(url);
        
        if (urlType === 'youtube') {
          blocks.push({
            type: 'video',
            url: url,
            platform: 'youtube'
          });
        } else if (urlType === 'image') {
          blocks.push({
            type: 'image',
            image: { 
              type: 'external', 
              external: { url: url }
            }
          });
        } else {
          blocks.push({
            type: 'bookmark',
            url: url,
            urlType: urlType
          });
        }
        continue;
      }
      
      // Images avec syntaxe Markdown
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
          // Image invalide - créer un bloc d'erreur informatif
          blocks.push({
            type: 'callout',
            callout: {
              rich_text: [{
                type: 'text',
                text: { content: `Image non supportée : ${altText || 'Sans titre'}` }
              }],
              icon: { emoji: '⚠️' },
              color: 'yellow_background'
            }
          });
        }
        continue;
      }
      
      // Titres
      if (line.startsWith('# ')) {
        blocks.push({
          type: 'heading_1',
          heading_1: {
            rich_text: parseRichText(line.slice(2).trim())
          }
        });
      } else if (line.startsWith('## ')) {
        blocks.push({
          type: 'heading_2',
          heading_2: {
            rich_text: parseRichText(line.slice(3).trim())
          }
        });
      } else if (line.startsWith('### ')) {
        blocks.push({
          type: 'heading_3',
          heading_3: {
            rich_text: parseRichText(line.slice(4).trim())
          }
        });
      }
      // Cases à cocher
      else if (line.match(/^[-*]\s+\[([ xX])\]\s+/)) {
        const isChecked = line.match(/\[(xX)\]/);
        const content = line.replace(/^[-*]\s+\[([ xX])\]\s+/, '');
        blocks.push({
          type: 'to_do',
          to_do: {
            rich_text: parseRichText(content),
            checked: !!isChecked
          }
        });
      }
      // Listes à puces
      else if (line.match(/^[-*]\s+/)) {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: parseRichText(line.replace(/^[-*]\s+/, ''))
          }
        });
      }
      // Listes numérotées
      else if (line.match(/^\d+\.\s+/)) {
        blocks.push({
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: parseRichText(line.replace(/^\d+\.\s+/, ''))
          }
        });
      }
      // Citations
      else if (line.startsWith('> ')) {
        blocks.push({
          type: 'quote',
          quote: {
            rich_text: parseRichText(line.slice(2).trim())
          }
        });
      }
      // Callouts (syntaxe spéciale)
      else if (line.match(/^[>!]\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i)) {
        const match = line.match(/^[>!]\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)/i);
        const calloutType = match[1].toUpperCase();
        const calloutContent = match[2];
        
        const emojiMap = {
          'NOTE': '📝',
          'TIP': '💡',
          'IMPORTANT': '❗',
          'WARNING': '⚠️',
          'CAUTION': '🚨'
        };
        
        blocks.push({
          type: 'callout',
          callout: {
            rich_text: parseRichText(calloutContent),
            icon: { emoji: emojiMap[calloutType] || '📌' },
            color: calloutType === 'WARNING' || calloutType === 'CAUTION' ? 'red_background' : 'gray_background'
          }
        });
      }
      // Paragraphe normal
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

  // Rendu des blocs
  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'heading_1':
        return (
          <h1 key={index} className="text-2xl font-bold mb-4 text-gray-900">
            {renderRichText(block.heading_1.rich_text)}
          </h1>
        );
        
      case 'heading_2':
        return (
          <h2 key={index} className="text-xl font-semibold mb-3 text-gray-800">
            {renderRichText(block.heading_2.rich_text)}
          </h2>
        );
        
      case 'heading_3':
        return (
          <h3 key={index} className="text-lg font-medium mb-2 text-gray-700">
            {renderRichText(block.heading_3.rich_text)}
          </h3>
        );
        
      case 'paragraph':
        return (
          <p key={index} className="mb-3 text-gray-700 leading-relaxed">
            {renderRichText(block.paragraph.rich_text)}
          </p>
        );
        
      case 'bulleted_list_item':
        return (
          <div key={index} className="flex items-start mb-2">
            <span className="text-gray-400 mr-2 mt-1">•</span>
            <span className="flex-1 text-gray-700">
              {renderRichText(block.bulleted_list_item.rich_text)}
            </span>
          </div>
        );
        
      case 'numbered_list_item':
        return (
          <div key={index} className="flex items-start mb-2">
            <span className="text-gray-400 mr-2">{index + 1}.</span>
            <span className="flex-1 text-gray-700">
              {renderRichText(block.numbered_list_item.rich_text)}
            </span>
          </div>
        );
        
      case 'to_do':
        return (
          <div key={index} className="flex items-start mb-2">
            <input
              type="checkbox"
              checked={block.to_do.checked}
              readOnly
              className="mr-2 mt-1"
            />
            <span className={`flex-1 ${block.to_do.checked ? 'line-through text-gray-500' : 'text-gray-700'}`}>
              {renderRichText(block.to_do.rich_text)}
            </span>
          </div>
        );
        
      case 'quote':
        return (
          <blockquote key={index} className="border-l-4 border-gray-300 pl-4 py-2 mb-3 italic text-gray-600">
            {renderRichText(block.quote.rich_text)}
          </blockquote>
        );
        
      case 'callout':
        return (
          <div key={index} className={`p-4 rounded-lg mb-3 flex items-start ${
            block.callout.color === 'red_background' ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'
          }`}>
            <span className="mr-3 text-xl">{block.callout.icon?.emoji || '📌'}</span>
            <div className="flex-1">
              {renderRichText(block.callout.rich_text)}
            </div>
          </div>
        );
        
      case 'code':
        return (
          <div key={index} className="mb-3">
            <div className="bg-gray-800 text-gray-100 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-900 text-xs text-gray-400 flex items-center justify-between">
                <span>{block.code.language || 'text'}</span>
                <FileCode size={14} />
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className="text-sm font-mono">
                  {block.code.rich_text[0]?.text.content || ''}
                </code>
              </pre>
            </div>
          </div>
        );
        
      case 'divider':
        return <hr key={index} className="my-6 border-gray-300" />;
        
      case 'image':
        return (
          <div key={index} className="mb-4">
            <img
              src={block.image.external.url}
              alt={block.image.caption?.[0]?.text.content || ''}
              className="max-w-full h-auto rounded-lg shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="16"%3EImage non disponible%3C/text%3E%3C/svg%3E';
              }}
            />
            {block.image.caption?.length > 0 && (
              <p className="text-sm text-gray-600 mt-2 text-center">
                {renderRichText(block.image.caption)}
              </p>
            )}
          </div>
        );
        
      case 'video':
        return (
          <div key={index} className="mb-4 bg-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Video size={20} className="text-red-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-800">Vidéo {block.platform}</p>
                  <p className="text-sm text-gray-600 truncate max-w-md">{block.url}</p>
                </div>
              </div>
              <a
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        );
        
      case 'bookmark':
        const iconMap = {
          'youtube': <Youtube size={20} className="text-red-600" />,
          'github': <FileText size={20} className="text-gray-800" />,
          'twitter': <Globe size={20} className="text-blue-400" />,
          'google-docs': <FileText size={20} className="text-blue-600" />,
          'document': <File size={20} className="text-gray-600" />,
          'website': <Globe size={20} className="text-gray-600" />
        };
        
        return (
          <div key={index} className="mb-3 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between"
            >
              <div className="flex items-center">
                {iconMap[block.urlType] || <Link2 size={20} className="text-gray-600" />}
                <span className="ml-3 text-blue-600 hover:underline">{block.url}</span>
              </div>
              <ExternalLink size={16} className="text-gray-400" />
            </a>
          </div>
        );
        
      case 'table':
        return (
          <div key={index} className="mb-4 overflow-x-auto">
            <table className="min-w-full border-collapse">
              <tbody>
                {block.tableRows.map((row, rowIndex) => {
                  const cells = row.split('|').filter(cell => cell.trim());
                  const isHeader = rowIndex === 0;
                  const isSeparator = row.includes('---');
                  
                  if (isSeparator) return null;
                  
                  return (
                    <tr key={rowIndex} className={isHeader ? 'bg-gray-100' : ''}>
                      {cells.map((cell, cellIndex) => {
                        const Tag = isHeader ? 'th' : 'td';
                        return (
                          <Tag
                            key={cellIndex}
                            className={`border border-gray-300 px-4 py-2 text-left ${
                              isHeader ? 'font-semibold' : ''
                            }`}
                          >
                            {cell.trim()}
                          </Tag>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        
      case 'error':
        return (
          <div key={index} className="mb-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-700">
              <AlertCircle size={20} className="mr-2" />
              <span>{block.message}</span>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const renderRichText = (richTextArray) => {
    if (!richTextArray || !Array.isArray(richTextArray)) return null;
    
    return richTextArray.map((element, index) => {
      const { text, annotations = {} } = element;
      let content = text?.content || '';
      
      // Appliquer les annotations
      if (annotations.bold) content = <strong key={index}>{content}</strong>;
      if (annotations.italic) content = <em key={index}>{content}</em>;
      if (annotations.code) content = <code key={index} className="px-1 py-0.5 bg-gray-200 rounded text-sm">{content}</code>;
      if (annotations.strikethrough) content = <del key={index}>{content}</del>;
      
      // Liens
      if (text?.link) {
        content = (
          <a
            key={index}
            href={text.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {content}
          </a>
        );
      }
      
      return content;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="notion-preview">
      {blocks.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          <p>Aucun contenu à prévisualiser</p>
        </div>
      ) : (
        <div className="space-y-1">
          {blocks.map((block, index) => renderBlock(block, index))}
        </div>
      )}
    </div>
  );
};

export default NotionPreview;