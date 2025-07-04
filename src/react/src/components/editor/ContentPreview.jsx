// src/react/src/components/editor/ContentPreview.jsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ContentPreview({ content, contentType }) {
  if (!content) {
    return (
      <div className="p-8 text-center text-notion-gray-400 dark:text-notion-gray-600">
        <p>L'aperçu apparaîtra ici</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (contentType) {
      case 'markdown':
        return (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-notion-gray-100 dark:bg-notion-dark-hover px-1 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                );
              },
              h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-notion-gray-900 dark:text-white">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 text-notion-gray-900 dark:text-white">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-medium mb-2 text-notion-gray-900 dark:text-white">{children}</h3>,
              p: ({ children }) => <p className="mb-4 text-notion-gray-700 dark:text-notion-gray-300">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-4 text-notion-gray-700 dark:text-notion-gray-300">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-4 text-notion-gray-700 dark:text-notion-gray-300">{children}</ol>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-notion-gray-300 dark:border-notion-gray-600 pl-4 italic mb-4 text-notion-gray-600 dark:text-notion-gray-400">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full divide-y divide-notion-gray-200 dark:divide-notion-dark-border">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="px-4 py-2 text-left text-sm font-medium text-notion-gray-900 dark:text-white bg-notion-gray-50 dark:bg-notion-dark-hover">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2 text-sm text-notion-gray-700 dark:text-notion-gray-300 border-t border-notion-gray-200 dark:border-notion-dark-border">
                  {children}
                </td>
              ),
              a: ({ href, children }) => (
                <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        );

      case 'code':
        return (
          <SyntaxHighlighter
            style={oneDark}
            language="javascript"
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: '14px'
            }}
          >
            {content}
          </SyntaxHighlighter>
        );

      case 'url':
        const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        const isValidUrl = urlRegex.test(content);
        
        return (
          <div className="p-4">
            {isValidUrl ? (
              <a
                href={content.startsWith('http') ? content : `https://${content}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 border border-notion-gray-200 dark:border-notion-dark-border rounded-lg hover:bg-notion-gray-50 dark:hover:bg-notion-dark-hover transition-colors"
              >
                <p className="text-sm text-notion-gray-500 dark:text-notion-gray-400 mb-1">Lien</p>
                <p className="text-blue-600 dark:text-blue-400 font-medium truncate">{content}</p>
              </a>
            ) : (
              <p className="text-red-600 dark:text-red-400">URL invalide</p>
            )}
          </div>
        );

      case 'image':
        if (content.startsWith('data:image/')) {
          return (
            <div className="p-4">
              <img
                src={content}
                alt="Aperçu"
                className="max-w-full h-auto rounded-lg shadow-sm"
              />
            </div>
          );
        }
        return <p className="p-4 text-notion-gray-500">Format d'image non supporté</p>;

      case 'table':
        // Parser simple pour les tables markdown
        const lines = content.trim().split('\n');
        if (lines.length < 2) {
          return <p className="p-4 text-notion-gray-500">Format de table invalide</p>;
        }

        const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
        const rows = lines.slice(2).map(line => 
          line.split('|').map(cell => cell.trim()).filter(cell => cell)
        );

        return (
          <div className="p-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-notion-gray-200 dark:divide-notion-dark-border">
              <thead>
                <tr>
                  {headers.map((header, i) => (
                    <th key={i} className="px-4 py-2 text-left text-sm font-medium text-notion-gray-900 dark:text-white bg-notion-gray-50 dark:bg-notion-dark-hover">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 text-sm text-notion-gray-700 dark:text-notion-gray-300 border-t border-notion-gray-200 dark:border-notion-dark-border">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <div className="p-4 whitespace-pre-wrap text-notion-gray-700 dark:text-notion-gray-300">
            {content}
          </div>
        );
    }
  };

  return (
    <div className="min-h-full bg-white dark:bg-notion-dark-secondary">
      {renderContent()}
    </div>
  );
}