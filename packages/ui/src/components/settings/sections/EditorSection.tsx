/**
 * EditorSection - Éditeur avec accent violet
 */

import React, { useState } from 'react';
import { SettingsCard, SettingsRow, SettingsDivider, SettingsToggle, SettingsSelect } from '../components/SettingsCard';

interface EditorSectionProps {
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const EditorSection: React.FC<EditorSectionProps> = () => {
  const [fontSize, setFontSize] = useState(14);
  const [autoSave, setAutoSave] = useState(true);
  const [spellCheck, setSpellCheck] = useState(true);
  const [markdownShortcuts, setMarkdownShortcuts] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(false);

  return (
    <div className="space-y-4 max-w-lg">
      {/* Typography */}
      <SettingsCard title="Typographie">
        <SettingsRow label="Taille" description="Taille du texte">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="12"
              max="18"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-16 h-1 bg-gray-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
            />
            <span className="text-[11px] text-gray-500 dark:text-gray-400 w-6 text-right">{fontSize}</span>
          </div>
        </SettingsRow>
        <SettingsDivider />
        <SettingsRow label="Police">
          <SettingsSelect
            value="system"
            onChange={() => {}}
            options={[
              { value: 'system', label: 'Système' },
              { value: 'inter', label: 'Inter' },
              { value: 'mono', label: 'Mono' },
            ]}
          />
        </SettingsRow>
      </SettingsCard>

      {/* Behavior */}
      <SettingsCard title="Comportement">
        <SettingsRow label="Sauvegarde auto" description="Enregistrer automatiquement">
          <SettingsToggle checked={autoSave} onChange={setAutoSave} />
        </SettingsRow>
        <SettingsDivider />
        <SettingsRow label="Orthographe" description="Correction automatique">
          <SettingsToggle checked={spellCheck} onChange={setSpellCheck} />
        </SettingsRow>
        <SettingsDivider />
        <SettingsRow label="Markdown" description="Raccourcis Markdown">
          <SettingsToggle checked={markdownShortcuts} onChange={setMarkdownShortcuts} />
        </SettingsRow>
      </SettingsCard>

      {/* Advanced */}
      <SettingsCard title="Avancé">
        <SettingsRow label="Numéros de ligne">
          <SettingsToggle checked={lineNumbers} onChange={setLineNumbers} />
        </SettingsRow>
        <SettingsDivider />
        <SettingsRow label="Template par défaut">
          <SettingsSelect
            value="none"
            onChange={() => {}}
            options={[
              { value: 'none', label: 'Aucun' },
              { value: 'note', label: 'Note' },
              { value: 'meeting', label: 'Réunion' },
            ]}
          />
        </SettingsRow>
      </SettingsCard>

      {/* Preview */}
      <div className="p-4 rounded-xl bg-violet-500/[0.03] dark:bg-violet-400/[0.03] border border-violet-500/10">
        <p className="text-[10px] text-violet-600/60 dark:text-violet-400/60 mb-2">Aperçu</p>
        <div 
          className="p-3 rounded-lg bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-200 border border-gray-200/30 dark:border-white/[0.04]"
          style={{ fontSize: `${fontSize}px` }}
        >
          Exemple de texte avec <strong>gras</strong> et <em>italique</em>.
        </div>
      </div>
    </div>
  );
};
