/**
 * Settings UI Components Premium - Apple/Notion/Linear inspired
 * Glassmorphism, depth, spring animations, micro-interactions
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon, ChevronDown, Check } from 'lucide-react';

// ============================================
// SETTINGS CARD - With variants
// ============================================

type CardVariant = 'default' | 'elevated' | 'glass' | 'accent';

interface SettingsCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  /** @deprecated Use variant="accent" instead */
  accent?: boolean;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  description,
  children,
  className = '',
  variant = 'default',
  accent = false,
}) => {
  // Support legacy accent prop
  const effectiveVariant = accent ? 'accent' : variant;

  const variantStyles: Record<CardVariant, string> = {
    default: 'bg-gray-50/80 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.04]',
    elevated: 'bg-white dark:bg-white/[0.03] border border-gray-200/40 dark:border-white/[0.06] shadow-sm dark:shadow-none',
    glass: 'bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/[0.08]',
    accent: 'bg-violet-500/[0.04] dark:bg-violet-400/[0.05] border border-violet-500/15 dark:border-violet-400/15',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className={`
        rounded-xl overflow-hidden
        ${variantStyles[effectiveVariant]}
        ${className}
      `}
    >
      {(title || description) && (
        <div className="px-5 py-3.5 border-b border-gray-200/30 dark:border-white/[0.04]">
          {title && (
            <h3 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="p-5">{children}</div>
    </motion.div>
  );
};

// ============================================
// SETTINGS ROW - Enhanced hover states
// ============================================

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  description,
  children,
  className = '',
  onClick,
}) => {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ backgroundColor: 'rgba(139, 92, 246, 0.04)' }}
      whileTap={onClick ? { scale: 0.995 } : undefined}
      className={`
        flex items-center justify-between py-3 px-2 -mx-2 rounded-xl
        transition-colors duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-[13px] font-medium text-gray-700 dark:text-gray-200">{label}</p>
        {description && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </motion.div>
  );
};

// ============================================
// SETTINGS DIVIDER - Gradient
// ============================================

export const SettingsDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`h-px bg-gradient-to-r from-transparent via-gray-200/60 dark:via-white/[0.06] to-transparent my-1 ${className}`} />
);

// ============================================
// SETTINGS TOGGLE - Premium spring animation
// ============================================

interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
}) => {
  const sizes = {
    sm: { track: 'w-8 h-5', thumb: 'w-4 h-4', translate: 'left-[14px]' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'left-[22px]' },
  };

  const s = sizes[size];

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      whileTap={{ scale: 0.95 }}
      className={`
        relative ${s.track} rounded-full transition-all duration-300 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${checked 
          ? 'bg-violet-500 shadow-inner shadow-violet-600/20' 
          : 'bg-gray-200 dark:bg-gray-700'
        }
      `}
    >
      {/* Glow effect when checked */}
      {checked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 rounded-full bg-violet-500/20 blur-md"
        />
      )}
      
      {/* Thumb */}
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        className={`
          absolute top-0.5 ${s.thumb} rounded-full bg-white
          shadow-sm shadow-black/10
          ${checked ? s.translate : 'left-0.5'}
        `}
      >
        {/* Inner highlight */}
        <span className="absolute inset-0.5 rounded-full bg-gradient-to-b from-white to-gray-50" />
      </motion.span>
    </motion.button>
  );
};

// ============================================
// SETTINGS BUTTON - Premium with variants
// ============================================

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface SettingsButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
}) => {
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white shadow-sm shadow-violet-500/25 hover:shadow-md hover:shadow-violet-500/30',
    secondary: 'bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/[0.1] active:bg-gray-300 dark:active:bg-white/[0.12]',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 active:bg-red-500/25',
    ghost: 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-violet-600 dark:hover:text-violet-400',
    success: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-sm shadow-emerald-500/25',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    xs: 'px-2 py-1 text-[10px] gap-1',
    sm: 'px-2.5 py-1.5 text-[11px] gap-1.5',
    md: 'px-3.5 py-2 text-[12px] gap-1.5',
    lg: 'px-4 py-2.5 text-[13px] gap-2',
  };

  const iconSizes: Record<ButtonSize, number> = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-200 ease-out
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
      `}
    >
      {loading ? (
        <motion.div
          className="border-2 border-current border-t-transparent rounded-full"
          style={{ width: iconSizes[size], height: iconSizes[size] }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      ) : Icon && iconPosition === 'left' ? (
        <Icon size={iconSizes[size]} strokeWidth={2} />
      ) : null}
      
      <span>{children}</span>
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon size={iconSizes[size]} strokeWidth={2} />
      )}
    </motion.button>
  );
};


// ============================================
// SETTINGS SELECT - Custom dropdown
// ============================================

interface SettingsSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; icon?: LucideIcon }>;
  disabled?: boolean;
  placeholder?: string;
}

export const SettingsSelect: React.FC<SettingsSelectProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = 'Sélectionner...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        whileTap={{ scale: 0.98 }}
        className={`
          flex items-center justify-between gap-2 min-w-[120px]
          px-3 py-2 text-[12px] font-medium
          bg-gray-100 dark:bg-white/[0.06] 
          rounded-lg border-0
          text-gray-700 dark:text-gray-200 
          transition-all duration-200
          hover:bg-gray-200 dark:hover:bg-white/[0.1]
          focus:outline-none focus:ring-2 focus:ring-violet-500/30
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'ring-2 ring-violet-500/30' : ''}
        `}
      >
        <span className={!selectedOption ? 'text-gray-400' : ''}>
          {selectedOption?.label || placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} strokeWidth={2} className="text-gray-400" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="absolute z-50 top-full left-0 right-0 mt-1.5 py-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/50 dark:border-white/[0.08] shadow-lg shadow-black/10 dark:shadow-black/30 overflow-hidden"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              const OptionIcon = option.icon;
              
              return (
                <motion.button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  whileHover={{ backgroundColor: 'rgba(139, 92, 246, 0.08)' }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-left text-[12px]
                    transition-colors duration-150
                    ${isSelected 
                      ? 'text-violet-600 dark:text-violet-400 font-medium' 
                      : 'text-gray-700 dark:text-gray-200'
                    }
                  `}
                >
                  {OptionIcon && <OptionIcon size={14} strokeWidth={1.5} />}
                  <span className="flex-1">{option.label}</span>
                  {isSelected && (
                    <Check size={14} strokeWidth={2.5} className="text-violet-500" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// SETTINGS INPUT - Premium focus states
// ============================================

interface SettingsInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  disabled?: boolean;
  error?: string;
  icon?: LucideIcon;
}

export const SettingsInput: React.FC<SettingsInputProps> = ({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  disabled = false,
  error,
  icon: Icon,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative">
      {Icon && (
        <Icon 
          size={14} 
          strokeWidth={1.5}
          className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
            isFocused ? 'text-violet-500' : 'text-gray-400'
          }`}
        />
      )}
      
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          w-full py-2.5 text-[13px]
          ${Icon ? 'pl-9 pr-3' : 'px-3'}
          bg-gray-50 dark:bg-white/[0.03]
          rounded-xl border
          text-gray-800 dark:text-gray-100
          placeholder:text-gray-400 dark:placeholder:text-gray-500
          transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-300 dark:border-red-500/50 focus:ring-red-500/20 focus:border-red-400' 
            : 'border-gray-200/60 dark:border-white/[0.08] focus:ring-violet-500/20 focus:border-violet-400/50'
          }
          focus:outline-none focus:ring-2
        `}
      />
      
      {/* Focus glow */}
      {isFocused && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 rounded-xl bg-violet-500/5 pointer-events-none"
        />
      )}
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-[11px] text-red-500 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

// ============================================
// SETTINGS BADGE - With variants
// ============================================

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'premium' | 'info';

interface SettingsBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
}

export const SettingsBadge: React.FC<SettingsBadgeProps> = ({
  children,
  variant = 'default',
  dot = false,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    error: 'bg-red-500/10 text-red-600 dark:text-red-400',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    premium: 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-500/25',
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-gray-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    premium: 'bg-white',
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2 py-0.5 
      text-[10px] font-semibold uppercase tracking-wider
      rounded-md ${variantStyles[variant]}
    `}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
};

// ============================================
// SETTINGS ALERT - Enhanced
// ============================================

type AlertVariant = 'info' | 'warning' | 'error' | 'success';

interface SettingsAlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
  icon?: LucideIcon;
  title?: string;
}

export const SettingsAlert: React.FC<SettingsAlertProps> = ({
  children,
  variant = 'info',
  icon: Icon,
  title,
}) => {
  const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: string }> = {
    info: {
      bg: 'bg-violet-500/5 dark:bg-violet-400/5',
      border: 'border-violet-500/15 dark:border-violet-400/15',
      text: 'text-violet-700 dark:text-violet-300',
      icon: 'text-violet-500',
    },
    warning: {
      bg: 'bg-amber-500/5 dark:bg-amber-400/5',
      border: 'border-amber-500/15 dark:border-amber-400/15',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-500',
    },
    error: {
      bg: 'bg-red-500/5 dark:bg-red-400/5',
      border: 'border-red-500/15 dark:border-red-400/15',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-500',
    },
    success: {
      bg: 'bg-emerald-500/5 dark:bg-emerald-400/5',
      border: 'border-emerald-500/15 dark:border-emerald-400/15',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-500',
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border ${styles.bg} ${styles.border}`}
    >
      <div className="flex gap-3">
        {Icon && (
          <Icon size={18} strokeWidth={1.5} className={`flex-shrink-0 mt-0.5 ${styles.icon}`} />
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <p className={`text-[13px] font-semibold ${styles.text} mb-1`}>{title}</p>
          )}
          <div className={`text-[12px] ${styles.text} leading-relaxed`}>
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// SETTINGS SECTION HEADER - New component
// ============================================

interface SettingsSectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({
  title,
  description,
  action,
}) => {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {description && (
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

// ============================================
// SETTINGS SHORTCUT KEY - New component
// ============================================

interface SettingsShortcutKeyProps {
  keys: string[];
}

export const SettingsShortcutKey: React.FC<SettingsShortcutKeyProps> = ({ keys }) => {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400 rounded-md border border-gray-200/50 dark:border-white/[0.08] font-mono shadow-sm">
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-[10px] text-gray-300 dark:text-gray-600">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
