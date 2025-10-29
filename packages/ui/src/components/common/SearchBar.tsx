// packages/ui/src/components/common/SearchBar.tsx
// ✅ CORRECTION: Bouton clear parfaitement centré + limitation de longueur

import React, { useRef, RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    inputRef?: RefObject<HTMLInputElement>;
    maxLength?: number;
}

export function SearchBar({
    value,
    onChange,
    placeholder = 'Rechercher des pages...',
    autoFocus = false,
    maxLength = 100
}: SearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClear = () => {
        onChange('');
        inputRef.current?.focus();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (maxLength && newValue.length > maxLength) {
            onChange(newValue.substring(0, maxLength));
        } else {
            onChange(newValue);
        }
    };

    return (
        <div className="p-4 pb-3 border-b border-gray-100 dark:border-[#373737] bg-white dark:bg-[#191919]">
            <div className="relative flex items-center">
                <Search
                    size={16}
                    strokeWidth={2}
                    className="absolute left-3 text-gray-400 dark:text-gray-500 pointer-events-none"
                />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    autoFocus={autoFocus}
                    maxLength={maxLength}
                    className="
                        w-full h-10 pl-9 pr-10
                        bg-gray-50 dark:bg-gray-800 
                        border border-gray-200 dark:border-gray-700 
                        rounded-lg 
                        text-sm font-medium
                        text-gray-900 dark:text-gray-100 
                        placeholder-gray-400 dark:placeholder-gray-500 
                        focus:outline-none 
                        focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-600 
                        focus:border-transparent
                        transition-all duration-200
                    "
                    style={{
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                    }}
                />
                <AnimatePresence>
                    {value && (
                        <motion.button
                            key="clear-search"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            onClick={handleClear}
                            type="button"
                            className="
                                absolute right-2
                                flex items-center justify-center
                                w-6 h-6
                                hover:bg-gray-200 dark:hover:bg-gray-700 
                                rounded-full 
                                transition-colors duration-200
                                cursor-pointer
                            "
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <X
                                size={16}
                                strokeWidth={2.5}
                                className="text-gray-600 dark:text-gray-400"
                            />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
            
            {/* ✅ Indicateur de caractères restants si proche de la limite */}
            {value.length > maxLength * 0.8 && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                    {value.length}/{maxLength}
                </div>
            )}
        </div>
    );
}