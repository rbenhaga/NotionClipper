// packages/ui/src/components/common/ShortcutsModal.tsx
// 🎯 Modal pour afficher les raccourcis clavier - Design Notion/Apple

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command } from 'lucide-react';
import { KeyboardShortcut, formatShortcut } from '../../hooks/ui/useKeyboardShortcuts';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export function ShortcutsModal({ isOpen, onClose, shortcuts }: ShortcutsModalProps) {
  // Grouper les raccourcis par catégorie
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'Autres';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Flou style macOS */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-50"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{
                type: 'spring',
                duration: 0.4,
                bounce: 0.3
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#191919] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
            >
              {/* Header - Style Notion minimaliste */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  {/* Icône Command élégante */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center shadow-sm">
                    <Command className="w-5 h-5 text-gray-700 dark:text-gray-300" strokeWidth={2} />
                  </div>

                  <div>
                    <h2 className="text-[19px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                      Raccourcis clavier
                    </h2>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Gagnez du temps avec ces raccourcis
                    </p>
                  </div>
                </div>

                {/* Bouton fermer - Style macOS */}
                <button
                  onClick={onClose}
                  className="group w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" strokeWidth={2} />
                </button>
              </div>

              {/* Content - Scroll élégant */}
              <div className="overflow-y-auto max-h-[calc(85vh-160px)] px-8 py-6 custom-scrollbar">
                <div className="space-y-8">
                  {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                    <div key={category}>
                      {/* Titre de catégorie */}
                      <h3 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
                        {category}
                      </h3>

                      {/* Liste des raccourcis */}
                      <div className="space-y-1">
                        {categoryShortcuts.map((shortcut, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="group flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
                          >
                            {/* Description */}
                            <span className="text-[14px] text-gray-700 dark:text-gray-300 font-medium">
                              {shortcut.description}
                            </span>

                            {/* Touches - Style macOS */}
                            <div className="flex items-center gap-1.5">
                              {formatShortcut(shortcut).split(' + ').map((key, i, arr) => (
                                <React.Fragment key={i}>
                                  <kbd className="
                                    min-w-[28px] h-7 px-2.5 
                                    flex items-center justify-center
                                    text-[12px] font-semibold 
                                    text-gray-700 dark:text-gray-200 
                                    bg-white dark:bg-gray-800 
                                    border border-gray-300 dark:border-gray-700
                                    rounded-md 
                                    shadow-sm
                                    group-hover:border-gray-400 dark:group-hover:border-gray-600
                                    transition-colors
                                  ">
                                    {key}
                                  </kbd>
                                  {i < arr.length - 1 && (
                                    <span className="text-gray-400 dark:text-gray-500 text-[11px] font-medium mx-0.5">
                                      +
                                    </span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer - Style Notion */}
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center justify-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
                  <span>Appuyez sur</span>
                  <kbd className="px-2 py-1 text-[11px] font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
                    Shift
                  </kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 text-[11px] font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
                    ?
                  </kbd>
                  <span>pour afficher cette aide</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Custom scrollbar styles */}
          <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(0, 0, 0, 0.2);
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(0, 0, 0, 0.3);
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.2);
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.3);
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}