// packages/ui/src/components/pages/FocusModeButton.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Loader2 } from 'lucide-react';


export interface FocusModeButtonProps {
  page: any;
  isActive: boolean;
  isLoading?: boolean;
  onToggle: (page: any) => void;
  compact?: boolean;
}

export const FocusModeButton: React.FC<FocusModeButtonProps> = ({
  page,
  isActive,
  isLoading = false,
  onToggle,
  compact = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(page);
  };

  return (
    <motion.button
      className={`focus-mode-button ${isActive ? 'active' : ''} ${compact ? 'compact' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isActive ? 'Mode Focus actif' : 'Activer le Mode Focus'}
    >
      {/* Glow effect quand actif */}
      {isActive && (
        <motion.div
          className="focus-button-glow"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}

      {/* Icône */}
      <motion.div
        className="focus-button-icon"
        animate={{
          rotate: isLoading ? 360 : 0
        }}
        transition={{
          duration: 1,
          repeat: isLoading ? Infinity : 0,
          ease: 'linear'
        }}
      >
        {isLoading ? (
          <Loader2 size={compact ? 14 : 16} />
        ) : (
          <Target size={compact ? 14 : 16} />
        )}
      </motion.div>

      {/* Label (seulement si pas compact) */}
      {!compact && (
        <span className="focus-button-label">
          {isActive ? 'Focus' : 'Mode Focus'}
        </span>
      )}

      {/* Indicateur pulse */}
      {isActive && !compact && (
        <motion.div
          className="focus-button-pulse"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}
    </motion.button>
  );
};