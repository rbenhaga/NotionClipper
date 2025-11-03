// packages/ui/src/components/editor/TableOfContents.tsx
// ✅ CORRECTION COMPLÈTE: Insertion après bloc avec appendBlockChildren

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain, MotionAside } from '../common/MotionWrapper';
import { List, ChevronRight, Hash, ArrowDown } from 'lucide-react';

interface Heading {
    id: string;
    blockId: string;
    level: 1 | 2 | 3;
    text: string;
    index: number;
}

interface TableOfContentsProps {
    pageId: string | null;
    multiSelectMode?: boolean;
    onInsertAfter: (blockId: string, headingText: string) => void;
    className?: string;
    onRecalculateRef?: React.MutableRefObject<(() => void) | null>;
    compact?: boolean; // Mode compact pour intégration dans carrousel
}

export function TableOfContents({
    pageId,
    multiSelectMode = false,
    onInsertAfter,
    className = '',
    onRecalculateRef,
    compact = false
}: TableOfContentsProps) {
    const [headings, setHeadings] = useState<Heading[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [selectedHeadingId, setSelectedHeadingId] = useState<string | null>(null);
    const [allBlocks, setAllBlocks] = useState<any[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedHeadingData, setSelectedHeadingData] = useState<Heading | null>(null);

    // ✅ Ne pas afficher si multi-select ou pas de page sélectionnée
    useEffect(() => {
        if (!pageId || multiSelectMode) {
            setHeadings([]);
            setSelectedHeadingId(null);
            setAllBlocks([]);
            return;
        }

        // ✅ Debounce pour éviter les appels multiples rapides
        const timeoutId = setTimeout(() => {
            const fetchBlocks = async () => {
                setLoading(true);
                try {
                    console.log('[TOC] Fetching blocks for page:', pageId);
                    const blocks = await (window as any).electronAPI.invoke('notion:get-page-blocks', pageId);
                    setAllBlocks(blocks); // ✅ Stocker tous les blocs pour éviter de refetch

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
                    console.log('[TOC] Found', extractedHeadings.length, 'headings');
                } catch (error) {
                    console.error('[TOC] Error fetching page blocks:', error);
                    setHeadings([]);
                    setAllBlocks([]);
                } finally {
                    setLoading(false);
                }
            };

            fetchBlocks();
        }, 300); // ✅ Attendre 300ms avant de charger

        return () => clearTimeout(timeoutId);
    }, [pageId, multiSelectMode, refreshTrigger]); // ✅ Refetch quand refreshTrigger change



    const handleHeadingClick = async (heading: Heading) => {
        try {
            // ✅ TOUJOURS refetch les blocs pour avoir la version la plus récente
            console.log('[TOC] Refetching blocks before calculating position');
            const freshBlocks = await (window as any).electronAPI.invoke('notion:get-page-blocks', pageId);

            // ✅ Trouver l'index du heading sélectionné dans les blocs frais
            const headingIndex = freshBlocks.findIndex((b: any) => b.id === heading.blockId);

            if (headingIndex === -1) {
                setSelectedHeadingId(heading.blockId);
                onInsertAfter(heading.blockId, heading.text);
                return;
            }

            // ✅ Trouver le dernier bloc de cette section
            let lastBlockId = heading.blockId;

            for (let i = headingIndex + 1; i < freshBlocks.length; i++) {
                const block = freshBlocks[i];
                const blockType = block.type;

                // Si on trouve un heading du même niveau ou supérieur, on s'arrête
                if (blockType.startsWith('heading_')) {
                    const blockLevel = parseInt(blockType.split('_')[1]);
                    if (blockLevel <= heading.level) {
                        break;
                    }
                }

                // Sinon, ce bloc fait partie de la section
                lastBlockId = block.id;
            }

            console.log(`[TOC] Section "${heading.text}": inserting after block ${lastBlockId} (fresh calculation)`);
            setSelectedHeadingId(heading.blockId);
            setSelectedHeadingData(heading); // ✅ Stocker les données du heading pour recalcul
            onInsertAfter(lastBlockId, heading.text);
        } catch (error) {
            console.error('[TOC] Error finding last block of section:', error);
            // Fallback: insérer après le heading
            setSelectedHeadingId(heading.blockId);
            onInsertAfter(heading.blockId, heading.text);
        }
    };

    // ✅ Fonction pour recalculer la position après un envoi
    const recalculatePosition = useCallback(async () => {
        if (!selectedHeadingData || !pageId) {
            console.log('[TOC] Recalculate skipped - no heading data or pageId');
            return;
        }
        
        console.log(`[TOC] 🔄 Recalculating position for heading: ${selectedHeadingData.text}`);
        try {
            // Refetch les blocs (devrait être non-caché maintenant)
            const freshBlocks = await (window as any).electronAPI.invoke('notion:get-page-blocks', pageId);
            console.log(`[TOC] 📦 Got ${freshBlocks.length} fresh blocks`);
            
            // Trouver l'index du heading sélectionné
            const headingIndex = freshBlocks.findIndex((b: any) => b.id === selectedHeadingData.blockId);
            
            if (headingIndex === -1) {
                console.log('[TOC] ❌ Heading not found in fresh blocks');
                return;
            }
            
            // Recalculer le dernier bloc de la section
            let lastBlockId = selectedHeadingData.blockId;
            let blocksInSection = 0;
            
            for (let i = headingIndex + 1; i < freshBlocks.length; i++) {
                const block = freshBlocks[i];
                const blockType = block.type;
                
                if (blockType.startsWith('heading_')) {
                    const blockLevel = parseInt(blockType.split('_')[1]);
                    if (blockLevel <= selectedHeadingData.level) {
                        break;
                    }
                }
                
                lastBlockId = block.id;
                blocksInSection++;
            }
            
            console.log(`[TOC] 📍 Section has ${blocksInSection} blocks, last block: ${lastBlockId}`);
            console.log(`[TOC] ✅ Recalculated position: ${lastBlockId}`);
            
            // Mettre à jour la position pour le prochain envoi
            onInsertAfter(lastBlockId, selectedHeadingData.text);
        } catch (error) {
            console.error('[TOC] ❌ Error recalculating position:', error);
        }
    }, [selectedHeadingData, pageId, onInsertAfter]);

    // ✅ Exposer la fonction de recalcul via la ref
    useEffect(() => {
        if (onRecalculateRef) {
            onRecalculateRef.current = recalculatePosition;
        }
    }, [recalculatePosition, onRecalculateRef]);

    // ✅ Ne rien afficher si conditions non remplies (sauf en mode compact)
    if (!pageId || (!compact && multiSelectMode) || headings.length === 0) {
        if (compact && headings.length === 0) {
            return (
                <div className="text-center py-8">
                    <Hash size={24} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Aucune section trouvée</p>
                </div>
            );
        }
        return null;
    }

    // Mode compact pour intégration dans carrousel
    if (compact) {
        return (
            <div className="space-y-1">
                {loading ? (
                    <div className="text-center py-4">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Chargement...</span>
                    </div>
                ) : (
                    headings.map((heading) => (
                        <button
                            key={heading.id}
                            onClick={() => handleHeadingClick(heading)}
                            className={`
                                w-full text-left px-3 py-2 flex items-start gap-2 transition-all rounded-lg
                                ${heading.level === 1 ? 'pl-3' : heading.level === 2 ? 'pl-6' : 'pl-9'}
                                ${selectedHeadingId === heading.blockId
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium border border-blue-200 dark:border-blue-800'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                                }
                            `}
                        >
                            <Hash
                                size={heading.level === 1 ? 14 : heading.level === 2 ? 12 : 10}
                                className={selectedHeadingId === heading.blockId ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}
                            />
                            <span className={`text-xs leading-relaxed line-clamp-2 ${heading.level === 1 ? 'font-semibold' : heading.level === 2 ? 'font-medium' : ''}`}>
                                {heading.text}
                            </span>
                        </button>
                    ))
                )}
                
                {selectedHeadingId && (
                    <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                            <ArrowDown size={10} />
                            <span>Insertion en fin de section</span>
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <AnimatePresence>
            <MotionAside
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
                        <nav className="py-2 max-h-[60vh] overflow-y-auto notion-scrollbar-vertical">
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
                      ${selectedHeadingId === heading.blockId
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }
                    `}
                                    >
                                        <Hash
                                            size={heading.level === 1 ? 16 : heading.level === 2 ? 14 : 12}
                                            className={selectedHeadingId === heading.blockId ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}
                                        />
                                        <span className={`text-sm leading-relaxed line-clamp-2 ${heading.level === 1 ? 'font-semibold' : heading.level === 2 ? 'font-medium' : ''}`}>
                                            {heading.text}
                                        </span>
                                    </button>
                                ))
                            )}
                        </nav>
                    )}

                    {!isCollapsed && !loading && headings.length > 0 && selectedHeadingId && (
                        <div className="px-4 py-2 border-t border-gray-200/50 dark:border-gray-700/50">
                            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                <ArrowDown size={12} />
                                <span>Insertion en fin de cette section</span>
                            </p>
                        </div>
                    )}
                </div>
            </MotionAside>
        </AnimatePresence>
    );
}