// packages/ui/src/components/common/SearchBar.tsx
// ✅ CORRECTION: Bouton clear parfaitement centré + limitation de longueur

import React, { useRef, RefObject } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain, MotionAside } from '../common/MotionWrapper';
import { Search, X } from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';

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
    placeholder,
    autoFocus = false,
    maxLength = 100
}: SearchBarProps) {
    const { t } = useTranslation();
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
        <div className="p-4 pb-3 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg)]">
            <div className="relative flex items-center">
                <Search
                    size={16}
                    strokeWidth={2}
                    className="absolute left-3 text-[var(--ds-fg-subtle)] pointer-events-none"
                />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder || t('common.searchPages')}
                    value={value}
                    onChange={handleChange}
                    autoFocus={autoFocus}
                    maxLength={maxLength}
                    className="ds-input w-full h-10 pl-9 pr-10 rounded-lg text-sm font-medium"
                    style={{
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                    }}
                />
                <AnimatePresence>
                    {value && (
                        <MotionButton
                            key="clear-search"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            onClick={handleClear}
                            type="button"
                            className="
                                absolute right-2
                                ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm
                                rounded-full
                            "
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <X size={14} strokeWidth={2.5} />
                        </MotionButton>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Indicateur de caractères restants si proche de la limite */}
            {value.length > maxLength * 0.8 && (
                <div className="mt-1 text-xs text-[var(--ds-fg-subtle)] text-right">
                    {value.length}/{maxLength}
                </div>
            )}
        </div>
    );
}