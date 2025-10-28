// packages/ui/src/components/editor/TableOfContents.tsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { List, ChevronRight, Hash, ArrowDown } from 'lucide-react';

interface Heading {
  id: string;
  blockId: string;
  level: 1 | 2 | 3;
  text: string;
  index: number;
}

interface TableOfContentsProps {
  pageId: string;
  multiSelectMode?: boolean; // ✅ NOUVEAU: Désactiver en mode multi-select
  onInsertAfter: (blockId: string, headingText: string) => void;
  className?: string;
}

export function TableOfContents({
  pageId,
  multiSelectMode = false,
  onInsertAfter,
  className = ''
}: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // ✅ CORRECTION: Ne pas afficher si multi-select actif
  if (multiSelectMode) {
    return null;
  }

  useEffect(() => {
    if (!pageId) {
      setHeadings([]);
      return;
    }

    const fetchBlocks = async () => {
      setLoading(true);
      try {
        const blocks = await (window as any).electronAPI.getPageBlocks(pageId);
        
        const extractedHeadings: Heading[] = [];
        blocks.forEach((block: any, index: number) => {
          if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
            const level = parseInt(block.type.split('_')[1]) as 1 | 2 | 3;
            const text = block[block.type]?.rich_text?.[0]?.plain_text || 'Sans titre';
            
            extractedHeadings.push({
              id: `heading-${index}`,
              blockId: block.id,
              level,
              text,
              index
            });
          }
        });

        setHeadings(extractedHeadings);
      } catch (error) {
        console.error('Error fetching page blocks:', error);
        setHeadings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
  }, [pageId]);

  const handleHeadingClick = (heading: Heading) => {
    setSelectedBlockId(heading.blockId);
    onInsertAfter(heading.blockId, heading.text);
  };

  // ✅ Ne rien afficher si pas de headings, pas de pageId, ou en mode multi-select
  if (!pageId || headings.length === 0 || multiSelectMode) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className={`fixed right-6 top-32 z-30 ${className}`}
      >
        <div className={`
          bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl
          rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50
          transition-all duration-300
          ${isCollapsed ? 'w-12' : 'w-64'}
        `}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <List size={16} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sommaire</span>
              </div>
            )}
            
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight 
                size={16}
                className={`text-gray-500 dark:text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
              />
            </button>
          </div>

          {!isCollapsed && (
            <nav className="py-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Chargement...</div>
              ) : (
                headings.map((heading) => (
                  <button
                    key={heading.id}
                    onClick={() => handleHeadingClick(heading)}
                    className={`
                      w-full text-left px-3 py-2 flex items-start gap-2 transition-all
                      ${heading.level === 1 ? 'pl-3' : heading.level === 2 ? 'pl-6' : 'pl-9'}
                      ${selectedBlockId === heading.blockId
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Hash 
                      size={heading.level === 1 ? 16 : heading.level === 2 ? 14 : 12}
                      className={selectedBlockId === heading.blockId ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}
                    />
                    <span className={`text-sm leading-relaxed line-clamp-2 ${heading.level === 1 ? 'font-semibold' : heading.level === 2 ? 'font-medium' : ''}`}>
                      {heading.text}
                    </span>
                    {selectedBlockId === heading.blockId && (
                      <ArrowDown size={14} className="text-blue-500 dark:text-blue-400 ml-auto" />
                    )}
                  </button>
                ))
              )}
            </nav>
          )}

          {!isCollapsed && !loading && headings.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200/50 dark:border-gray-700/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedBlockId ? '✓ Position sélectionnée' : 'Cliquez pour choisir'}
              </p>
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}