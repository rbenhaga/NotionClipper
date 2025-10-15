// packages/ui/src/components/layout/DynamicIsland.tsx
import { useState, useCallback, useEffect, memo } from 'react';
import { motion, useSpring, AnimatePresence } from 'framer-motion';
import {
  Send,
  ListChecks,
  Clock,
  Loader,
  CheckCircle,
  XCircle,
  Paperclip
} from 'lucide-react';

// Types
type IslandState = 'compact' | 'hover' | 'expanded' | 'processing' | 'success' | 'error';
type ActionId = 'send' | 'queue' | 'history' | 'upload';

interface DynamicIslandAction {
  id: ActionId;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number;
  disabled?: boolean;
}

interface DynamicIslandProps {
  actions: DynamicIslandAction[];
  status?: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
  queueCount?: number;
  historyCount?: number;
  onStateChange?: (state: IslandState) => void;
}

// Constants
const DIMENSIONS = {
  compact: { width: 120, height: 40, borderRadius: 20 },
  hover: { width: 140, height: 44, borderRadius: 22 },
  expanded: { width: 'auto', height: 44, borderRadius: 22 }
};

const COLORS = {
  default: 'rgba(17, 24, 39, 0.95)',
  processing: 'rgba(59, 130, 246, 0.95)',
  success: 'rgba(16, 185, 129, 0.95)',
  error: 'rgba(239, 68, 68, 0.95)'
};

// Component
export const DynamicIsland = memo(function DynamicIsland({
  actions,
  status = 'idle',
  message,
  queueCount = 0,
  historyCount = 0,
  onStateChange
}: DynamicIslandProps) {
  // State
  const [islandState, setIslandState] = useState<IslandState>('compact');
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Springs for smooth animations
  const scaleSpring = useSpring(1, { stiffness: 300, damping: 20 });
  const opacitySpring = useSpring(1, { stiffness: 300, damping: 20 });

  // Determine state based on status and interactions
  useEffect(() => {
    if (status === 'processing') {
      setIslandState('processing');
    } else if (status === 'success') {
      setIslandState('success');
      // Auto-dismiss after 2 seconds
      const timer = setTimeout(() => {
        setIslandState('compact');
        setIsExpanded(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (status === 'error') {
      setIslandState('error');
      // Don't auto-dismiss errors
    } else if (isExpanded) {
      setIslandState('expanded');
    } else if (isHovered) {
      setIslandState('hover');
    } else {
      setIslandState('compact');
    }
  }, [status, isExpanded, isHovered]);

  // Notify state changes
  useEffect(() => {
    onStateChange?.(islandState);
  }, [islandState, onStateChange]);

  // Handlers
  const handleToggle = useCallback(() => {
    if (islandState === 'processing') return; // Prevent interaction during processing
    setIsExpanded(prev => !prev);
  }, [islandState]);

  const handleActionClick = useCallback((action: DynamicIslandAction) => {
    if (action.disabled) return;
    action.onClick();
    setIsExpanded(false); // Close after action
  }, []);

  // Get background color based on state
  const getBackgroundColor = () => {
    switch (islandState) {
      case 'processing': return COLORS.processing;
      case 'success': return COLORS.success;
      case 'error': return COLORS.error;
      default: return COLORS.default;
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (islandState) {
      case 'processing':
        return <Loader size={16} className="animate-spin" />;
      case 'success':
        return <CheckCircle size={16} />;
      case 'error':
        return <XCircle size={16} />;
      default:
        return <Send size={16} />;
    }
  };

  // Animation variants
  const containerVariants = {
    compact: {
      width: DIMENSIONS.compact.width,
      height: DIMENSIONS.compact.height,
      borderRadius: DIMENSIONS.compact.borderRadius,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    },
    hover: {
      width: DIMENSIONS.hover.width,
      height: DIMENSIONS.hover.height,
      borderRadius: DIMENSIONS.hover.borderRadius,
      scale: 1.02,
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
    },
    expanded: {
      width: DIMENSIONS.expanded.width,
      height: DIMENSIONS.expanded.height,
      borderRadius: DIMENSIONS.expanded.borderRadius,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    },
    processing: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    success: {
      scale: [1, 1.15, 1],
      transition: {
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1]
      }
    },
    error: {
      x: [-5, 5, -5, 5, -3, 3, -1, 1, 0],
      transition: {
        duration: 0.5,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div
      className="relative flex items-center justify-center cursor-pointer overflow-hidden px-4"
      style={{
        backgroundColor: getBackgroundColor(),
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        scale: scaleSpring,
        opacity: opacitySpring
      }}
      variants={containerVariants}
      initial="compact"
      animate={islandState}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleToggle}
      role="button"
      aria-label="Actions rapides"
      aria-expanded={isExpanded}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      {/* Shimmer effect for processing */}
      {islandState === 'processing' && (
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            backgroundSize: '200% 100%'
          }}
          animate={{
            backgroundPosition: ['200% 0%', '-200% 0%']
          }}
          transition={{
            duration: 2,
            ease: "linear",
            repeat: Infinity
          }}
        />
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {islandState === 'expanded' ? (
          // Expanded state - show all actions
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            {actions.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                onClick={() => handleActionClick(action)}
              />
            ))}
          </motion.div>
        ) : (
          // Compact state - show icon and badges
          <motion.div
            key="compact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-white"
          >
            {getStatusIcon()}
            
            {/* Status message or badges */}
            {message ? (
              <span className="text-sm font-medium">{message}</span>
            ) : (
              <div className="flex items-center gap-1">
                {queueCount > 0 && (
                  <Badge count={queueCount} />
                )}
                {historyCount > 0 && !queueCount && (
                  <Badge count={historyCount} variant="secondary" />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// Action Button Component
const ActionButton = memo(function ActionButton({
  action,
  onClick
}: {
  action: DynamicIslandAction;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={action.disabled}
      className={`
        relative flex items-center gap-2 px-3 py-2
        bg-white/10 hover:bg-white/20
        rounded-full text-white text-sm font-medium
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {action.icon}
      <span>{action.label}</span>
      
      {action.badge && action.badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
          {action.badge > 99 ? '99+' : action.badge}
        </span>
      )}
    </motion.button>
  );
});

// Badge Component
const Badge = memo(function Badge({
  count,
  variant = 'primary'
}: {
  count: number;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`
        px-2 py-0.5 rounded-full text-xs font-medium
        ${variant === 'primary'
          ? 'bg-white/20 text-white'
          : 'bg-white/10 text-white/70'
        }
      `}
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
});