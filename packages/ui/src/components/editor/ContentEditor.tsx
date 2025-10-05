import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Trash2, Type, Image, Code, List, CheckSquare,
    ChevronDown, ChevronUp, X, Star, Smile, Calendar,
    Tag, Link2, Loader
} from 'lucide-react';
import { NotionPage } from '../../types';

interface ContentEditorProps {
    clipboard: {
        content: string;
        type: 'text' | 'image' | 'html';
        metadata?: {
            url?: string;
            title?: string;
            selection?: string;
        };
    } | null;
    editedClipboard: any;
    onEditContent: (content: any) => void;
    onClearClipboard: () => Promise<void>;
    selectedPage: NotionPage | null;
    selectedPages: string[];
    multiSelectMode: boolean;
    sending: boolean;
    onSend: () => void;
    canSend: boolean;
    contentProperties: any;
    onUpdateProperties: (properties: any) => void;
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    pages: NotionPage[];
    onDeselectPage?: (pageId: string) => void;
    showPreview?: boolean;
    config?: any;
}

/**
 * Éditeur de contenu principal
 * Permet d'éditer et d'envoyer du contenu vers Notion
 */
export function ContentEditor({
    clipboard,
    editedClipboard,
    onEditContent,
    onClearClipboard,
    selectedPage,
    selectedPages,
    multiSelectMode,
    sending,
    onSend,
    canSend,
    contentProperties,
    onUpdateProperties,
    showNotification,
    pages,
    onDeselectPage,
    showPreview = false,
    config
}: ContentEditorProps) {
    // États locaux
    const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
    const [optionsExpanded, setOptionsExpanded] = useState(false);
    const [contentType, setContentType] = useState('paragraph');
    const [pageTitle, setPageTitle] = useState('');
    const [tags, setTags] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [pageIcon, setPageIcon] = useState('');
    const [iconModified, setIconModified] = useState(false);
    const [pageCover, setPageCover] = useState('');
    const [isDatabasePage, setIsDatabasePage] = useState(false);
    const [hasScrollbar, setHasScrollbar] = useState(false);
    const destinationRef = useRef<HTMLDivElement>(null);

    const currentClipboard = editedClipboard || clipboard;

    // Détecter si scrollbar nécessaire
    useEffect(() => {
        const element = destinationRef.current;
        if (!element) return;

        const resizeObserver = new ResizeObserver(() => {
            const needsScrollbar = element.scrollWidth > element.clientWidth;
            setHasScrollbar(needsScrollbar);
        });

        resizeObserver.observe(element);
        const needsScrollbar = element.scrollWidth > element.clientWidth;
        setHasScrollbar(needsScrollbar);

        return () => resizeObserver.disconnect();
    }, [selectedPages, selectedPage, multiSelectMode]);

    // Mettre à jour isDatabasePage quand selectedPage change
    useEffect(() => {
        if (selectedPage) {
            const isDatabase = selectedPage.object === 'database' ||
                (selectedPage.parent?.type === 'database_id' && selectedPage.parent?.database_id);
            setIsDatabasePage(isDatabase);
        }
    }, [selectedPage]);

    // Mettre à jour les propriétés du contenu
    useEffect(() => {
        const properties = {
            contentType: contentType || 'paragraph',
            parseAsMarkdown: true,
            ...(pageCover && { cover: pageCover }),
        };
        onUpdateProperties(properties);
    }, [contentType, pageIcon, pageCover, iconModified, onUpdateProperties]);

    // Gérer l'édition du contenu
    const handleContentChange = (newContent: string) => {
        if (clipboard) {
            onEditContent({
                ...clipboard,
                content: newContent
            });
        }
    };

    // Affichage vide
    if (!currentClipboard) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-4 p-8">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                        <Type size={32} className="text-gray-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700">Aucun contenu</h3>
                        <p className="text-sm text-gray-500 mt-2">
                            Copiez du texte ou une image pour commencer
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Rendu principal
    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Zone de destination */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Send size={16} />
                        Destination
                    </h3>
                    {multiSelectMode && selectedPages.length > 0 && (
                        <span className="text-xs text-gray-500">
                            {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} sélectionnée{selectedPages.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <div
                    ref={destinationRef}
                    className={`flex gap-2 overflow-x-auto pb-2 ${hasScrollbar ? 'custom-scrollbar' : ''}`}
                >
                    {multiSelectMode ? (
                        selectedPages.length === 0 ? (
                            <div className="text-sm text-gray-500 py-2">
                                Aucune page sélectionnée
                            </div>
                        ) : (
                            selectedPages.map(pageId => {
                                const page = pages.find(p => p.id === pageId);
                                if (!page) return null;
                                return (
                                    <DestinationBadge
                                        key={pageId}
                                        page={page}
                                        onRemove={onDeselectPage ? () => onDeselectPage(pageId) : undefined}
                                    />
                                );
                            })
                        )
                    ) : selectedPage ? (
                        <DestinationBadge page={selectedPage} />
                    ) : (
                        <div className="text-sm text-gray-500 py-2">
                            Sélectionnez une page
                        </div>
                    )}
                </div>
            </div>

            {/* Options de formatage */}
            <div className="px-6 py-3 border-b border-gray-200 bg-white">
                <button
                    onClick={() => setOptionsExpanded(!optionsExpanded)}
                    className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                    <span className="flex items-center gap-2">
                        <Type size={16} />
                        Options de formatage
                    </span>
                    {optionsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <AnimatePresence>
                    {optionsExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-4 space-y-4 overflow-hidden"
                        >
                            {/* Type de contenu */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-2">
                                    Type de bloc
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    <FormatButton
                                        icon={<Type size={16} />}
                                        label="Paragraphe"
                                        active={contentType === 'paragraph'}
                                        onClick={() => setContentType('paragraph')}
                                    />
                                    <FormatButton
                                        icon={<List size={16} />}
                                        label="Liste"
                                        active={contentType === 'bulleted_list_item'}
                                        onClick={() => setContentType('bulleted_list_item')}
                                    />
                                    <FormatButton
                                        icon={<CheckSquare size={16} />}
                                        label="To-do"
                                        active={contentType === 'to_do'}
                                        onClick={() => setContentType('to_do')}
                                    />
                                    <FormatButton
                                        icon={<Code size={16} />}
                                        label="Code"
                                        active={contentType === 'code'}
                                        onClick={() => setContentType('code')}
                                    />
                                </div>
                            </div>

                            {/* Propriétés de page (si database) */}
                            {isDatabasePage && (
                                <div className="pt-4 border-t border-gray-200">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">
                                        Propriétés de la page
                                    </label>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={pageTitle}
                                            onChange={(e) => setPageTitle(e.target.value)}
                                            placeholder="Titre de la page..."
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={tags}
                                            onChange={(e) => setTags(e.target.value)}
                                            placeholder="Tags (séparés par des virgules)"
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Éditeur de contenu */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                            Contenu à envoyer
                        </label>
                        <textarea
                            value={currentClipboard.content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            className="w-full min-h-[200px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                            placeholder="Votre contenu apparaîtra ici..."
                        />
                    </div>

                    {currentClipboard.metadata?.url && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                            <Link2 size={14} />
                            <a
                                href={currentClipboard.metadata.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-600 truncate"
                            >
                                {currentClipboard.metadata.url}
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Barre d'actions */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <button
                    onClick={onClearClipboard}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <Trash2 size={16} />
                    <span className="text-sm font-medium">Effacer</span>
                </button>

                <button
                    onClick={onSend}
                    disabled={!canSend || sending}
                    className="flex items-center gap-2 px-6 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                    {sending ? (
                        <>
                            <Loader size={16} className="animate-spin" />
                            Envoi...
                        </>
                    ) : (
                        <>
                            <Send size={16} />
                            Envoyer
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// Composants auxiliaires
function DestinationBadge({
    page,
    onRemove
}: {
    page: NotionPage;
    onRemove?: () => void;
}) {
    const getPageIcon = (page: NotionPage) => {
        if (page.icon?.type === 'emoji') return page.icon.emoji;
        if (page.icon?.type === 'external') return '🔗';
        return page.object === 'database' ? '📊' : '📄';
    };

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm flex-shrink-0">
            <span>{getPageIcon(page)}</span>
            <span className="text-gray-700 font-medium max-w-[200px] truncate">
                {page.title || 'Sans titre'}
            </span>
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

function FormatButton({
    icon,
    label,
    active,
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${active
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
        >
            {icon}
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
}