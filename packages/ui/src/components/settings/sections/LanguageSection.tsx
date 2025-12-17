/**
 * LanguageSection - Langue avec accent violet
 */

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { SettingsCard, SettingsRow, SettingsDivider, SettingsSelect } from '../components/SettingsCard';

interface LanguageSectionProps {
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const languages = [
  { value: 'fr', flag: '🇫🇷', name: 'Français' },
  { value: 'en', flag: '🇬🇧', name: 'English' },
  { value: 'es', flag: '🇪🇸', name: 'Español' },
  { value: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { value: 'pt', flag: '🇵🇹', name: 'Português' },
  { value: 'it', flag: '🇮🇹', name: 'Italiano' },
  { value: 'ja', flag: '🇯🇵', name: '日本語' },
  { value: 'ko', flag: '🇰🇷', name: '한국어' },
];

export const LanguageSection: React.FC<LanguageSectionProps> = ({ showNotification }) => {
  const [locale, setLocale] = useState('fr');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState('24h');

  const handleChange = (val: string) => {
    setLocale(val);
    showNotification?.('Langue modifiée', 'success');
  };

  return (
    <div className="space-y-4 max-w-lg">
      {/* Language Grid */}
      <SettingsCard title="Langue">
        <div className="grid grid-cols-4 gap-2">
          {languages.map((lang) => {
            const isActive = locale === lang.value;
            return (
              <motion.button
                key={lang.value}
                onClick={() => handleChange(lang.value)}
                whileTap={{ scale: 0.97 }}
                className={`
                  relative flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all duration-150
                  ${isActive 
                    ? 'bg-violet-500/10 dark:bg-violet-400/10 ring-1 ring-violet-500/20' 
                    : 'hover:bg-gray-100 dark:hover:bg-white/[0.04]'
                  }
                `}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className={`text-[10px] ${
                  isActive 
                    ? 'text-violet-700 dark:text-violet-300 font-medium' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {lang.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="lang-check"
                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center"
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

      {/* Regional */}
      <SettingsCard title="Format">
        <SettingsRow label="Date">
          <SettingsSelect
            value={dateFormat}
            onChange={setDateFormat}
            options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
            ]}
          />
        </SettingsRow>
        <SettingsDivider />
        <SettingsRow label="Heure">
          <div className="flex gap-1">
            {['24h', '12h'].map((f) => (
              <button
                key={f}
                onClick={() => setTimeFormat(f)}
                className={`
                  px-2.5 py-1 text-[11px] rounded-md transition-colors
                  ${timeFormat === f
                    ? 'bg-violet-500 text-white font-medium'
                    : 'bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.08]'
                  }
                `}
              >
                {f}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
};
