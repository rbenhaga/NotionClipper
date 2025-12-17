/**
 * ShortcutsSection - Raccourcis avec accent violet
 */

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { SettingsCard } from '../components/SettingsCard';

interface ShortcutsSectionProps {
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 rounded font-mono border border-gray-200/50 dark:border-white/[0.06]">
    {children}
  </kbd>
);

export const ShortcutsSection: React.FC<ShortcutsSectionProps> = () => {
  const [search, setSearch] = useState('');
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { category: 'Général', items: [
      { label: 'Paramètres', keys: [mod, ','] },
      { label: 'Rechercher', keys: [mod, 'K'] },
      { label: 'Nouveau clip', keys: [mod, 'N'] },
      { label: 'Envoyer', keys: [mod, '↵'] },
    ]},
    { category: 'Éditeur', items: [
      { label: 'Gras', keys: [mod, 'B'] },
      { label: 'Italique', keys: [mod, 'I'] },
      { label: 'Lien', keys: [mod, 'K'] },
      { label: 'Code', keys: [mod, 'E'] },
      { label: 'Titre 1', keys: [mod, '⌥', '1'] },
      { label: 'Liste', keys: [mod, '⇧', '8'] },
    ]},
    { category: 'Actions', items: [
      { label: 'Annuler', keys: [mod, 'Z'] },
      { label: 'Rétablir', keys: [mod, '⇧', 'Z'] },
      { label: 'Copier', keys: [mod, 'C'] },
      { label: 'Coller', keys: [mod, 'V'] },
    ]},
  ];

  const filtered = shortcuts.map(cat => ({
    ...cat,
    items: cat.items.filter(s => s.label.toLowerCase().includes(search.toLowerCase()))
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="space-y-4 max-w-lg">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher"
          className="w-full pl-9 pr-3 py-2 text-[12px] bg-gray-50 dark:bg-white/[0.02] rounded-lg border border-gray-200/50 dark:border-white/[0.04] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/30 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>

      {/* Shortcuts */}
      {filtered.map((cat) => (
        <SettingsCard key={cat.category} title={cat.category}>
          <div className="space-y-1">
            {cat.items.map((s, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between py-1.5 px-1 -mx-1 rounded hover:bg-violet-500/[0.03] dark:hover:bg-violet-400/[0.03] transition-colors"
              >
                <span className="text-[12px] text-gray-600 dark:text-gray-300">{s.label}</span>
                <div className="flex items-center gap-0.5">
                  {s.keys.map((k, j) => (
                    <span key={j}>
                      <Kbd>{k}</Kbd>
                      {j < s.keys.length - 1 && <span className="text-gray-300 dark:text-gray-600 text-[10px] mx-0.5">+</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>
      ))}

      {/* Empty */}
      {filtered.length === 0 && search && (
        <div className="text-center py-8">
          <p className="text-[12px] text-gray-400 dark:text-gray-500">Aucun raccourci trouvé</p>
        </div>
      )}

      {/* Tip */}
      <div className="p-3 rounded-lg bg-violet-500/[0.03] dark:bg-violet-400/[0.03] border border-violet-500/10">
        <p className="text-[11px] text-violet-600/70 dark:text-violet-400/70">
          💡 <Kbd>⇧</Kbd> + <Kbd>?</Kbd> pour afficher les raccourcis
        </p>
      </div>
    </div>
  );
};
