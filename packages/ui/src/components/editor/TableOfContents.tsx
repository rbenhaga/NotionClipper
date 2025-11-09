// TableOfContents.tsx - Premium Apple/Notion Design System
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@notion-clipper/i18n';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionAside } from '../common/MotionWrapper';
import { List, ChevronRight, Hash, ArrowDown, Search, X } from 'lucide-react';

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
    compact?: boolean;
}

export function TableOfContents({
    pageId,
    multiSelectMode = false,
    onInsertAfter,
    className = '',
    onRecalculateRef,
    compact = false
}: TableOfContentsProps) {
    const { t } = useTranslation();
    const [headings, setHeadings] = useState<Heading[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [selectedHeadingId, setSelectedHeadingId] = useState<string | null>(null);
    const [selectedHeadingData, setSelectedHeadingData] = useState<Heading | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Charger les blocs de la page
    useEffect(() => {
        if (!pageId || multiSelectMode) {
            setHeadings([]);
            setSelectedHeadingId(null);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setLoading(true);
            try {
                const blocks = await (window as any).electronAPI.invoke('notion:get-page-blocks', pageId);
                
                const extractedHeadings: Heading[] = [];
                blocks.forEach((block: any, index: number) => {
                    if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
                        const level = parseInt(block.type.split('_')[1]) as 1 | 2 | 3;
                        const text = block[block.type]?.rich_text?.[0]?.plain_text || t('common.untitled');

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
                console.error('[TOC] Error fetching page blocks:', error);
                setHeadings([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [pageId, multiSelectMode]);

    // Filtrer les headings selon la recherche
    const filteredHeadings = useMemo(() => {
        if (!searchQuery.trim()) return headings;
        const query = searchQuery.toLowerCase();
        return headings.filter(h => h.text.toLowerCase().includes(query));
    }, [headings, searchQuery]);

    // Handler de clic sur un heading
    const handleHeadingClick = useCallback(async (heading: Heading) => {
        try {
            const freshBlocks = await (window as any).electronAPI.invoke('notion:get-page-blocks', pageId);
            const headingIndex = freshBlocks.findIndex((b: any) => b.id === heading.blockId);

            if (headingIndex === -1) {
                setSelectedHeadingId(heading.blockId);
                setSelectedHeadingData(heading);
                onInsertAfter(heading.blockId, heading.text);
                return;
            }

            let lastBlockId = heading.blockId;
            for (let i = headingIndex + 1; i < freshBlocks.length; i++) {
                const block = freshBlocks[i];
                const blockType = block.type;

                if (blockType.startsWith('heading_')) {
                    const blockLevel = parseInt(blockType.split('_')[1]);
                    if (blockLevel <= heading.level) break;
                }

                lastBlockId = block.id;
            }

            setSelectedHeadingId(heading.blockId);
            setSelectedHeadingData(heading);
            onInsertAfter(lastBlockId, heading.text);
        } catch (error) {
            console.error('[TOC] Error finding last block:', error);
            setSelectedHeadingId(heading.blockId);
            setSelectedHeadingData(heading);
            onInsertAfter(heading.blockId, heading.text);
        }
    }, [pageId, onInsertAfter]);

    // Recalculer la position après envoi
    const recalculatePosition = useCallback(async () => {
        if (!selectedHeadingData || !pageId) return;
        
        try {
            const freshBlocks = await (window as any).electronAPI.invoke('notion:get-page-blocks', pageId);
            const headingIndex = freshBlocks.findIndex((b: any) => b.id === selectedHeadingData.blockId);
            
            if (headingIndex === -1) return;
            
            let lastBlockId = selectedHeadingData.blockId;
            for (let i = headingIndex + 1; i < freshBlocks.length; i++) {
                const block = freshBlocks[i];
                const blockType = block.type;
                
                if (blockType.startsWith('heading_')) {
                    const blockLevel = parseInt(blockType.split('_')[1]);
                    if (blockLevel <= selectedHeadingData.level) break;
                }
                
                lastBlockId = block.id;
            }
            
            onInsertAfter(lastBlockId, selectedHeadingData.text);
        } catch (error) {
            console.error('[TOC] Error recalculating position:', error);
        }
    }, [selectedHeadingData, pageId, onInsertAfter]);

    // Exposer recalculate via ref
    useEffect(() => {
        if (onRecalculateRef) {
            onRecalculateRef.current = recalculatePosition;
        }
    }, [recalculatePosition, onRecalculateRef]);

    // Empty state
    if (!pageId || (!compact && multiSelectMode)) return null;

    if (headings.length === 0 && !loading) {
        if (compact) {
            return (
                <div className="text-center py-10">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Hash size={20} className="text-gray-300 dark:text-gray-600" strokeWidth={2} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.noSectionFound')}</p>
                </div>
            );
        }
        return null;
    }

    // Mode compact (pour carrousel)
    if (compact) {
        return (
            <div className="space-y-2">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('common.loading')}</span>
                    </div>
                ) : (
                    <>
                        {/* Search bar si plus de 5 headings */}
                        {headings.length > 5 && (
                            <div className="mb-3">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('common.search')}
                                        className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                        >
                                            <X size={12} className="text-gray-400" strokeWidth={2} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Headings list - ✅ Hauteur optimale et scroll fluide */}
                        <div className="space-y-1.5 overflow-y-auto notion-scrollbar" style={{ maxHeight: 'min(320px, calc(100vh - 400px))' }}>
                            {filteredHeadings.length === 0 ? (
                                <p className="text-center py-4 text-xs text-gray-500 dark:text-gray-400">
                                    {t('common.noResults')}
                                </p>
                            ) : (
                                filteredHeadings.map((heading) => (
                                    <button
                                        key={heading.id}
                                        onClick={() => handleHeadingClick(heading)}
                                        className={`
                                            w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-all rounded-lg group
                                            ${heading.level === 1 ? 'pl-3' : heading.level === 2 ? 'pl-6' : 'pl-9'}
                                            ${selectedHeadingId === heading.blockId
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium border-l-2 border-blue-500 shadow-sm'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-l-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                            }
                                        `}
                                    >
                                        <Hash
                                            size={heading.level === 1 ? 14 : heading.level === 2 ? 12 : 10}
                                            className={`flex-shrink-0 mt-0.5 transition-colors ${
                                                selectedHeadingId === heading.blockId 
                                                    ? 'text-blue-500' 
                                                    : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                                            }`}
                                            strokeWidth={2}
                                        />
                                        <span className={`text-xs leading-relaxed line-clamp-2 ${
                                            heading.level === 1 ? 'font-semibold' : heading.level === 2 ? 'font-medium' : ''
                                        }`}>
                                            {heading.text}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                )}
                
                {/* Info sur la sélection */}
                <AnimatePresence>
                    {selectedHeadingId && (
                        <MotionDiv
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                <ArrowDown size={12} strokeWidth={2} />
                                <span>{t('common.insertAtEndOfSection')}</span>
                            </p>
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // Mode sidebar (floating)
    return (
        <AnimatePresence>
            <MotionAside
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className={`fixed right-6 top-32 z-30 ${className}`}
            >
                <div className={`
                    bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl
                    rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50
                    transition-all duration-300
                    ${isCollapsed ? 'w-14' : 'w-72'}
                `}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200/50 dark:border-gray-700/50">
                        {!isCollapsed && (
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                                    <List size={14} className="text-white" strokeWidth={2} />
                                </div>
                                <div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('common.tableOfContents')}</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{headings.length} sections</p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronRight
                                size={16}
                                className={`text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                                    isCollapsed ? '' : 'rotate-180'
                                }`}
                                strokeWidth={2}
                            />
                        </button>
                    </div>

                    {/* Content */}
                    {!isCollapsed && (
                        <>
                            {/* Search bar */}
                            {headings.length > 5 && (
                                <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={t('common.search')}
                                            className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                            >
                                                <X size={12} className="text-gray-400" strokeWidth={2} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Headings list */}
                            <nav className="py-2 max-h-[60vh] overflow-y-auto notion-scrollbar-vertical">
                                {loading ? (
                                    <div className="px-4 py-10 text-center">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('common.loading')}</span>
                                    </div>
                                ) : filteredHeadings.length === 0 ? (
                                    <p className="px-4 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                                        {t('common.noResults')}
                                    </p>
                                ) : (
                                    filteredHeadings.map((heading) => (
                                        <button
                                            key={heading.id}
                                            onClick={() => handleHeadingClick(heading)}
                                            className={`
                                                w-full text-left px-3 py-2.5 flex items-start gap-2 transition-all group
                                                ${heading.level === 1 ? 'pl-3' : heading.level === 2 ? 'pl-6' : 'pl-9'}
                                                ${selectedHeadingId === heading.blockId
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium border-l-2 border-blue-500'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-l-2 border-transparent'
                                                }
                                            `}
                                        >
                                            <Hash
                                                size={heading.level === 1 ? 16 : heading.level === 2 ? 14 : 12}
                                                className={`flex-shrink-0 mt-0.5 transition-colors ${
                                                    selectedHeadingId === heading.blockId 
                                                        ? 'text-blue-500' 
                                                        : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                                                }`}
                                                strokeWidth={2}
                                            />
                                            <span className={`text-sm leading-relaxed line-clamp-2 ${
                                                heading.level === 1 ? 'font-semibold' : heading.level === 2 ? 'font-medium' : ''
                                            }`}>
                                                {heading.text}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </nav>

                            {/* Footer info */}
                            {!loading && selectedHeadingId && (
                                <div className="px-4 py-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-blue-50/50 dark:bg-blue-900/10">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                        <ArrowDown size={12} strokeWidth={2} />
                                        <span>{t('common.insertAtEndOfThisSection')}</span>
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </MotionAside>
        </AnimatePresence>
    );
}