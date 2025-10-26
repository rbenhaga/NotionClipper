import React, { useRef, RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    inputRef?: RefObject<HTMLInputElement>;
}

export function SearchBar({
    value,
    onChange,
    placeholder = 'Rechercher des pages...',
    autoFocus = false
}: SearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClear = () => {
        onChange('');
        inputRef.current?.focus();
    };

    return (
        <div className="p-4 pb-3 border-b border-gray-100 dark:border-[#373737] bg-white dark:bg-[#191919]">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoFocus={autoFocus}
                    className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-600 focus:border-transparent"
                />
                <AnimatePresence mode="wait">
                    {value && (
                        <motion.button
                            key="clear-search"
                            initial={{ opacity: 0, scale: 0, rotate: -180 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0, rotate: 180 }}
                            transition={{ duration: 0.2, type: "spring", stiffness: 500 }}
                            onClick={handleClear}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.85 }}
                        >
                            <X size={14} className="text-gray-400 dark:text-gray-500" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}