import { Star, FileText, Database } from 'lucide-react';

interface PageCardProps {
    page: {
        id: string;
        title: string;
        icon?: any;
        parent_title?: string;
        type?: string;
    };
    isSelected: boolean;
    isFavorite: boolean;
    onClick: () => void;
    onToggleFavorite: () => void;
}

export default function PageCard({ page, isSelected, isFavorite, onClick, onToggleFavorite }: PageCardProps) {
    return (
        <div
            className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                }`}
            onClick={onClick}
        >
            <div className="flex-shrink-0 w-4 h-4 mr-2">
                {page.icon?.emoji ? (
                    <span className="text-sm">{page.icon.emoji}</span>
                ) : (
                    <FileText className="w-4 h-4 text-gray-400" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate flex items-center gap-1.5">
                    {page.title || 'Sans titre'}
                    {page.type === 'database' && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-purple-100 text-purple-700">
                            <Database className="w-2 h-2 inline" />
                        </span>
                    )}
                </h3>
                {page.parent_title && (
                    <p className="text-xs text-gray-500 truncate">{page.parent_title}</p>
                )}
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                }}
                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
            >
                <Star
                    className={`w-3.5 h-3.5 ${isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`}
                />
            </button>
        </div>
    );
}