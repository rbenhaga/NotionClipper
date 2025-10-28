// packages/ui/src/components/common/Tooltip.tsx
// Design Notion/Apple moderne et élégant

import React, { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    content: string;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

/**
 * Tooltip élégant style Notion/Apple
 * ✨ Design premium avec animations fluides
 * ✨ Support dark mode
 * ✨ Positionnement intelligent
 */
export function Tooltip({ 
    content, 
    children, 
    position = 'top',
    delay = 400 
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [showTimeout, setShowTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        const timeout = setTimeout(() => {
            setIsVisible(true);
        }, delay);
        setShowTimeout(timeout);
    };

    const handleMouseLeave = () => {
        if (showTimeout) {
            clearTimeout(showTimeout);
            setShowTimeout(null);
        }
        setIsVisible(false);
    };

    // Classes de positionnement
    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    // Animation variants selon la position
    const getAnimationVariants = () => {
        const offset = 4;
        switch (position) {
            case 'top':
                return {
                    initial: { opacity: 0, y: offset },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: offset }
                };
            case 'bottom':
                return {
                    initial: { opacity: 0, y: -offset },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: -offset }
                };
            case 'left':
                return {
                    initial: { opacity: 0, x: offset },
                    animate: { opacity: 1, x: 0 },
                    exit: { opacity: 0, x: offset }
                };
            case 'right':
                return {
                    initial: { opacity: 0, x: -offset },
                    animate: { opacity: 1, x: 0 },
                    exit: { opacity: 0, x: -offset }
                };
        }
    };

    const variants = getAnimationVariants();

    // Flèche selon la position
    const getArrowClasses = () => {
        const baseClasses = "absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45";
        switch (position) {
            case 'top':
                return `${baseClasses} bottom-[-4px] left-1/2 -translate-x-1/2`;
            case 'bottom':
                return `${baseClasses} top-[-4px] left-1/2 -translate-x-1/2`;
            case 'left':
                return `${baseClasses} right-[-4px] top-1/2 -translate-y-1/2`;
            case 'right':
                return `${baseClasses} left-[-4px] top-1/2 -translate-y-1/2`;
        }
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            
            <AnimatePresence>
                {isVisible && content && (
                    <motion.div
                        initial={variants.initial}
                        animate={variants.animate}
                        exit={variants.exit}
                        transition={{ 
                            duration: 0.15,
                            ease: [0.16, 1, 0.3, 1]
                        }}
                        className={`
                            absolute z-50
                            ${positionClasses[position]}
                            pointer-events-none
                        `}
                    >
                        {/* Tooltip box */}
                        <div className="relative">
                            <div className="
                                px-3 py-2
                                bg-gray-900 dark:bg-gray-700
                                text-white dark:text-gray-100
                                text-[12px] font-medium
                                rounded-lg
                                shadow-lg shadow-black/20
                                whitespace-nowrap
                                max-w-xs
                                backdrop-blur-sm
                            ">
                                {content}
                            </div>
                            
                            {/* Flèche */}
                            <div className={getArrowClasses()} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}