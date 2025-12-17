/**
 * AboutSection - À propos avec accent violet
 */

import React from 'react';
import { ExternalLink, Heart, Github, Twitter, Mail, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { SettingsCard, SettingsButton } from '../components/SettingsCard';
import { ClipperProLogo } from '../../../assets/icons';

interface AboutSectionProps {
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AboutSection: React.FC<AboutSectionProps> = () => {
  const version = '1.0.0';

  const links = [
    { label: 'Site', url: '#', icon: ExternalLink },
    { label: 'Docs', url: '#', icon: ExternalLink },
    { label: 'GitHub', url: '#', icon: Github },
    { label: 'Twitter', url: '#', icon: Twitter },
    { label: 'Support', url: '#', icon: Mail },
  ];

  const changelog = [
    { version: '1.0.0', date: '16 Déc 2024', changes: ['Lancement officiel', 'Nouvelle interface'] },
    { version: '0.9.0', date: '1 Déc 2024', changes: ['Beta publique', 'Éditeur amélioré'] },
  ];

  return (
    <div className="space-y-4 max-w-lg">
      {/* Logo & Version */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-6 rounded-xl bg-gradient-to-br from-violet-500/[0.04] to-fuchsia-500/[0.02] border border-violet-500/10"
      >
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <ClipperProLogo size={32} className="text-white" />
        </div>
        <h2 className="text-[16px] font-semibold text-gray-800 dark:text-gray-100 mb-1">
          Clipper Pro
        </h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Version {version}
        </p>
      </motion.div>

      {/* Links */}
      <SettingsCard title="Liens">
        <div className="grid grid-cols-5 gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-violet-500/[0.04] dark:hover:bg-violet-400/[0.04] transition-colors group"
              >
                <Icon size={14} strokeWidth={1.5} className="text-gray-400 group-hover:text-violet-500 transition-colors" />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{link.label}</span>
              </a>
            );
          })}
        </div>
      </SettingsCard>

      {/* Changelog */}
      <SettingsCard title="Changelog">
        <div className="space-y-3">
          {changelog.map((release, i) => (
            <div key={release.version} className={i > 0 ? 'pt-3 border-t border-gray-200/30 dark:border-white/[0.04]' : ''}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[12px] font-medium text-gray-700 dark:text-gray-200">v{release.version}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{release.date}</span>
              </div>
              <ul className="space-y-0.5">
                {release.changes.map((c, j) => (
                  <li key={j} className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-violet-500/50" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Legal */}
      <SettingsCard title="Légal">
        <div className="space-y-1">
          {['Confidentialité', 'Conditions', 'Licences'].map((item) => (
            <a
              key={item}
              href="#"
              className="flex items-center justify-between py-1.5 px-1 -mx-1 rounded hover:bg-violet-500/[0.03] dark:hover:bg-violet-400/[0.03] transition-colors group"
            >
              <span className="text-[12px] text-gray-600 dark:text-gray-300">{item}</span>
              <ExternalLink size={10} className="text-gray-300 dark:text-gray-600 group-hover:text-violet-500 transition-colors" />
            </a>
          ))}
        </div>
      </SettingsCard>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
          Fait avec <Heart size={10} className="text-fuchsia-500" /> par Clipper Pro
        </p>
        <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1">
          © 2024 Tous droits réservés
        </p>
      </div>

      {/* Rate */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/[0.05] to-orange-500/[0.05] border border-amber-500/10">
        <div className="flex items-center gap-3">
          <Star size={16} strokeWidth={1.5} className="text-amber-500" />
          <div className="flex-1">
            <p className="text-[12px] text-gray-700 dark:text-gray-200">Vous aimez l'app ?</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Laissez une note</p>
          </div>
          <SettingsButton variant="secondary" size="sm" icon={Star}>Noter</SettingsButton>
        </div>
      </div>
    </div>
  );
};
