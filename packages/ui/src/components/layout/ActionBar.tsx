// packages/ui/src/components/layout/ActionBar.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


export interface Action {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number;
  disabled?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'default';
}

interface ActionBarProps {
  actions: Action[];
  status?: 'idle' | 'processing' | 'success' | 'error';
}

export function ActionBar({ actions, status = 'idle' }: ActionBarProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const getActionColor = (action: Action) => {
    if (action.disabled) return 'text-gray-300';
    
    switch (action.color) {
      case 'primary': return 'text-blue-600 hover:text-blue-700';
      case 'success': return 'text-green-600 hover:text-green-700';
      case 'warning': return 'text-orange-600 hover:text-orange-700';
      default: return 'text-gray-600 hover:text-gray-900';
    }
  };

  const getBadgeColor = (action: Action) => {
    switch (action.color) {
      case 'primary': return 'bg-blue-500';
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  // Filtrer les actions pour s'assurer qu'il n'y a pas de bouton "envoyer"
  const filteredActions = actions.filter(action => 
    action.id !== 'send' && 
    action.id !== 'submit' && 
    !action.label.toLowerCase().includes('envoyer')
  );

  if (filteredActions.length === 0) {
    return null;
  }

  return (
    <div className="no-drag flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-full px-2 py-1.5 shadow-sm border border-gray-200/50 
                    sm:gap-1 sm:px-2 sm:py-1.5
                    max-sm:gap-0.5 max-sm:px-1.5 max-sm:py-1
                    max-sm:scale-90">
      {filteredActions.map((action, index) => (
        <React.Fragment key={action.id}>
          {/* Séparateur */}
          {index > 0 && (
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
          )}
          
          {/* Bouton d'action */}
          <motion.button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!action.disabled) {
                action.onClick();
              }
            }}
            onMouseEnter={() => setHoveredAction(action.id)}
            onMouseLeave={() => setHoveredAction(null)}
            disabled={action.disabled}
            className={`
              no-drag relative group
              flex items-center justify-center
              w-10 h-10 rounded-full
              transition-all duration-200
              ${action.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
              ${getActionColor(action)}
              hover:bg-gray-50 active:bg-gray-100
              sm:w-10 sm:h-10
              max-sm:w-8 max-sm:h-8
              focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1
            `}
            whileHover={{ scale: action.disabled ? 1 : 1.05 }}
            whileTap={{ scale: action.disabled ? 1 : 0.95 }}
            type="button"
          >
            {/* Icône */}
            <div className="relative sm:scale-100 max-sm:scale-90">
              <div className="sm:text-lg max-sm:text-base">
                {action.icon}
              </div>
              
              {/* Badge */}
              {action.badge !== undefined && action.badge > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`
                    absolute -top-1 -right-1
                    min-w-[16px] h-[16px]
                    flex items-center justify-center
                    ${getBadgeColor(action)}
                    text-white text-[9px] font-semibold
                    rounded-full px-0.5
                    shadow-sm
                    sm:min-w-[18px] sm:h-[18px] sm:text-[10px] sm:px-1
                  `}
                >
                  {action.badge > 99 ? '99+' : action.badge}
                </motion.div>
              )}
            </div>

            {/* Tooltip - Masqué sur mobile */}
            <AnimatePresence>
              {hoveredAction === action.id && !action.disabled && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="
                    absolute -bottom-10 left-1/2 transform -translate-x-1/2
                    bg-gray-900 text-white text-xs font-medium
                    px-2 py-1 rounded shadow-lg
                    whitespace-nowrap z-50
                    pointer-events-none
                    hidden sm:block
                  "
                >
                  {action.label}
                  {/* Flèche */}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </React.Fragment>
      ))}

      {/* Indicateur de statut */}
      {status !== 'idle' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="ml-1 flex items-center"
        >
          {status === 'processing' && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
          {status === 'success' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              className="w-2 h-2 bg-green-500 rounded-full"
            />
          )}
          {status === 'error' && (
            <motion.div
              animate={{ x: [-2, 2, -2, 2, 0] }}
              transition={{ duration: 0.4 }}
              className="w-2 h-2 bg-red-500 rounded-full"
            />
          )}
        </motion.div>
      )}
    </div>
  );
}