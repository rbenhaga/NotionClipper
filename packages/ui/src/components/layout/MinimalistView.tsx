// packages/ui/src/components/layout/MinimalistView.tsx
import React, { useState, useMemo } from 'react';
import { ChevronDown, Send, X, Maximize2 } from 'lucide-react';
import { NotionPage } from '../../types';
import { getPageIcon } from '../../utils/helpers';

export interface MinimalistViewProps {
    clipboard: any;
    editedClipboard: string;
    onEditContent: (content: string) => void;
    selectedPage: NotionPage | null;
    pages: NotionPage[];
    onPageSelect: (page: NotionPage) => void;
    onSend: () => void;
    onClearClipboard: () => void;
    onExitMinimalist: () => void;
    sending: boolean;
    canSend: boolean;
}

/**
 * Vue minimaliste compacte pour l'envoi rapide
 * Design inspiré de Notion's Quick Add
 */
export function MinimalistView({
    clipboard,
    editedClipboard,
    onEditContent,
    selectedPage,
    pages,
    onPageSelect,
    onSend,
    onClearClipboard,
    onExitMinimalist,
    sending,
    canSend
}: MinimalistViewProps) {
    const [showPageSelector, setShowPageSelector] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filtrer les pages selon la recherche
    const filteredPages = useMemo(() => {
        if (!searchQuery.trim()) return pages;

        return pages.filter(page =>
            page.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [pages, searchQuery]);

    const handlePageSelect = (page: NotionPage) => {
        onPageSelect(page);
        setShowPageSelector(false);
        setSearchQuery('');
    };

    const hasContent = clipboard && (clipboard.text || clipboard.html || clipboard.images?.length > 0);

    return (
        <div className="flex-1 flex flex-col bg-white">
            {/* Header compact */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Mode Compact</span>
                </div>

                <button
                    onClick={onExitMinimalist}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Retour au mode normal"
                >
                    <Maximize2 className="w-4 h-4 text-gray-600" />
                </button>
            </div>

            {/* Sélecteur de page */}
            <div className="p-3 border-b border-gray-100">
                <div className="relative">
                    <button
                        onClick={() => setShowPageSelector(!showPageSelector)}
                        className="w-full flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {selectedPage ? (
                                <>
                                    <span className="text-sm">{getPageIcon(selectedPage).value}</span>
                                    <span className="text-sm text-gray-900 truncate">
                                        {selectedPage.title}
                                    </span>
                                </>
                            ) : (
                                <span className="text-sm text-gray-500">
                                    Sélectionner une page...
                                </span>
                            )}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPageSelector ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    {showPageSelector && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 page-selector-dropdown">
                            {/* Recherche */}
                            <div className="p-2 border-b border-gray-100">
                                <input
                                    type="text"
                                    placeholder="Rechercher une page..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>

                            {/* Liste des pages */}
                            <div className="max-h-48 overflow-y-auto minimalist-scrollbar">
                                {filteredPages.length > 0 ? (
                                    filteredPages.map((page) => (
                                        <button
                                            key={page.id}
                                            onClick={() => handlePageSelect(page)}
                                            className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <span className="text-sm">{getPageIcon(page).value}</span>
                                            <span className="text-sm text-gray-900 truncate flex-1">
                                                {page.title}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-sm text-gray-500">
                                        Aucune page trouvée
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Aperçu du contenu */}
            <div className="flex-1 p-3">
                <div className="h-full">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                        Contenu à envoyer
                    </label>

                    {hasContent ? (
                        <textarea
                            value={editedClipboard}
                            onChange={(e) => onEditContent(e.target.value)}
                            className="w-full h-full resize-none border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 minimalist-scrollbar"
                            placeholder="Votre contenu apparaîtra ici..."
                        />
                    ) : (
                        <div className="h-full border border-gray-200 rounded-lg p-3 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                                <div className="text-sm mb-1">Aucun contenu</div>
                                <div className="text-xs">Copiez du contenu pour commencer</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-gray-100">
                <div className="flex gap-2">
                    <button
                        onClick={onClearClipboard}
                        disabled={!hasContent}
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <X className="w-4 h-4 inline mr-1" />
                        Effacer
                    </button>

                    <button
                        onClick={onSend}
                        disabled={!canSend || sending}
                        className="flex-1 px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {sending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline mr-1"></div>
                                Envoi...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 inline mr-1" />
                                Envoyer
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Overlay pour fermer le dropdown */}
            {showPageSelector && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowPageSelector(false)}
                />
            )}
        </div>
    );
}