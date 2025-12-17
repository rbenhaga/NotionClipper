/**
 * AppearanceSection - Thème + Densité avec accent violet
 */

import React, { useState } from 'react';
import { Sun, Moon, Monitor, Check, LayoutGrid, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { SettingsCard, SettingsRow, SettingsDivider, SettingsToggle } from '../components/SettingsCard';
import { useDensityOptional } from '../../../contexts/DensityContext';

interface AppearanceSectionProps {
  theme?: 'light' | 'dark' | 'system';
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  theme = 'system',
  onThemeChange
}) => {
  const [animations, setAnimations] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const densityContext = useDensityOptional();

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Clair' },
    { value: 'dark' as const, icon: Moon, label: 'Sombre' },
    { value: 'system' as const, icon: Monitor, label: 'Système' },
  ];

  return (
    <div className="space-y-4 max-w-lg">
      {/* Theme Selection */}
      <SettingsCard title="Thème">
        <div className="flex gap-2">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.value;
            return (
              <motion.button
                key={t.value}
                onClick={() => onThemeChange?.(t.value)}
                whileTap={{ scale: 0.97 }}
                className={`
                  relative flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-150
                  ${isActive 
                    ? 'bg-violet-500/10 dark:bg-violet-400/10 ring-1 ring-violet-500/20' 
                    : 'hover:bg-gray-100 dark:hover:bg-white/[0.04]'
                  }
                `}
              >
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                  ${isActive 
                    ? 'bg-violet-500 shadow-sm shadow-violet-500/30' 
                    : 'bg-gray-100 dark:bg-white/[0.06]'
                  }
                `}>
                  <Icon 
                    size={18} 
                    strokeWidth={1.5}
                    className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'} 
                  />
                </div>
                <span className={`text-[12px] ${
                  isActive 
                    ? 'text-violet-700 dark:text-violet-300 font-medium' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {t.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="theme-check"
                    className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Check size={10} strokeWidth={2.5} className="text-white" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </SettingsCard>

      {/* Density - Mode d'affichage */}
      {densityContext && (
        <SettingsCard title="Densité" description="Ajustez l'espacement des éléments">
          <div className="flex gap-2">
            {[
              { value: 'comfortable' as const, icon: LayoutGrid, label: 'Confortable', desc: 'Plus d\'espace' },
              { value: 'compact' as const, icon: List, label: 'Compact', desc: 'Plus d\'éléments' },
            ].map((d) => {
              const Icon = d.icon;
              const isActive = densityContext.density === d.value;
              return (
                <motion.button
                  key={d.value}
                  onClick={() => densityContext.setDensity(d.value)}
                  whileTap={{ scale: 0.97 }}
                  className={`
                    relative flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-150
                    ${isActive 
                      ? 'bg-violet-500/10 dark:bg-violet-400/10 ring-1 ring-violet-500/20' 
                      : 'hover:bg-gray-100 dark:hover:bg-white/[0.04]'
                    }
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                    ${isActive 
                      ? 'bg-violet-500 shadow-sm shadow-violet-500/30' 
                      : 'bg-gray-100 dark:bg-white/[0.06]'
                    }
                  `}>
                    <Icon 
                      size={18} 
                      strokeWidth={1.5}
                      className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'} 
                    />
                  </div>
                  <div className="text-center">
                    <span className={`text-[12px] block ${
                      isActive 
                        ? 'text-violet-700 dark:text-violet-300 font-medium' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {d.label}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {d.desc}
                    </span>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="density-check"
                      className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Check size={10} strokeWidth={2.5} className="text-white" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </SettingsCard>
      )}

      {/* Effects */}
      <SettingsCard title="Effets">
        <SettingsRow label="Animations" description="Transitions fluides">
          <SettingsToggle checked={animations} onChange={setAnimations} />
        </SettingsRow>
        <SettingsDivider />
        <SettingsRow label="Réduire les mouvements" description="Accessibilité">
          <SettingsToggle checked={reducedMotion} onChange={setReducedMotion} />
        </SettingsRow>
      </SettingsCard>
    </div>
  );
};
