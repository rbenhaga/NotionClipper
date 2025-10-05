import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface EmptyStateProps {
    message: string;
    searchQuery?: string;
    onClearSearch?: () => void;
}

export function EmptyState({ message, searchQuery, onClearSearch }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-4">
            <div className="text-center flex flex-col items-center max-w-full px-4">
                <p className="text-sm mb-4 truncate max-w-full">
                    {message}
                </p>
                {searchQuery && onClearSearch && (
                    <motion.button
                        onClick={onClearSearch}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold 
                       px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-full 
                       transition-all duration-200 flex items-center gap-1.5"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <X size={12} />
                        Effacer la recherche
                    </motion.button>
                )}
            </div>
        </div>
    );
}