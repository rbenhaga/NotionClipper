/**
 * TemplateSelector Component
 * Sélection de templates pour structurer le contenu
 * Design minimaliste style Notion avec i18n complet
 */

import { useState, useMemo } from 'react';
import { 
  FileText, CheckSquare, Calendar,
  BookOpen, Lightbulb, Target, Users, Briefcase,
  Search, Clock, Plus, ChevronRight, Sparkles
} from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'basic' | 'productivity' | 'work' | 'personal';
  structure: TemplateBlock[];
  isPremium?: boolean;
  isNew?: boolean;
}

export interface TemplateBlock {
  type: 'heading' | 'paragraph' | 'bullet_list' | 'numbered_list' | 'todo' | 'quote' | 'divider' | 'callout';
  content?: string;
  children?: TemplateBlock[];
}

export interface TemplateSelectorProps {
  onSelectTemplate: (template: Template) => void;
  onCreateCustom?: () => void;
  recentTemplates?: string[];
  className?: string;
}

// Templates prédéfinis
const defaultTemplates: Template[] = [
  {
    id: 'meeting-notes',
    name: 'Notes de réunion',
    description: 'Structure pour prendre des notes de réunion efficacement',
    icon: <Users size={18} />,
    category: 'work',
    structure: [
      { type: 'heading', content: '📅 Réunion - [Date]' },
      { type: 'heading', content: 'Participants' },
      { type: 'bullet_list', content: '' },
      { type: 'heading', content: 'Ordre du jour' },
      { type: 'numbered_list', content: '' },
      { type: 'heading', content: 'Notes' },
      { type: 'paragraph', content: '' },
      { type: 'heading', content: 'Actions à suivre' },
      { type: 'todo', content: '' }
    ]
  },
  {
    id: 'daily-journal',
    name: 'Journal quotidien',
    description: 'Réflexion quotidienne et gratitude',
    icon: <BookOpen size={18} />,
    category: 'personal',
    structure: [
      { type: 'heading', content: '📝 Journal - [Date]' },
      { type: 'callout', content: '🙏 Gratitude' },
      { type: 'bullet_list', content: '' },
      { type: 'heading', content: "Aujourd'hui" },
      { type: 'paragraph', content: '' },
      { type: 'heading', content: 'Réflexions' },
      { type: 'paragraph', content: '' }
    ]
  },
  {
    id: 'project-brief',
    name: 'Brief projet',
    description: 'Document de cadrage pour un nouveau projet',
    icon: <Briefcase size={18} />,
    category: 'work',
    isPremium: true,
    structure: [
      { type: 'heading', content: '🎯 [Nom du projet]' },
      { type: 'heading', content: 'Contexte' },
      { type: 'paragraph', content: '' },
      { type: 'heading', content: 'Objectifs' },
      { type: 'bullet_list', content: '' },
      { type: 'heading', content: 'Livrables' },
      { type: 'todo', content: '' },
      { type: 'heading', content: 'Timeline' },
      { type: 'paragraph', content: '' },
      { type: 'heading', content: 'Ressources' },
      { type: 'bullet_list', content: '' }
    ]
  },
  {
    id: 'todo-list',
    name: 'Liste de tâches',
    description: 'Simple liste de tâches à accomplir',
    icon: <CheckSquare size={18} />,
    category: 'basic',
    structure: [
      { type: 'heading', content: '✅ Tâches' },
      { type: 'todo', content: '' },
      { type: 'divider' },
      { type: 'heading', content: '📌 Notes' },
      { type: 'paragraph', content: '' }
    ]
  },
  {
    id: 'brainstorm',
    name: 'Brainstorming',
    description: 'Capturer et organiser vos idées',
    icon: <Lightbulb size={18} />,
    category: 'productivity',
    isNew: true,
    structure: [
      { type: 'heading', content: '💡 Brainstorming - [Sujet]' },
      { type: 'callout', content: '🎯 Objectif: ' },
      { type: 'heading', content: 'Idées' },
      { type: 'bullet_list', content: '' },
      { type: 'heading', content: 'À explorer' },
      { type: 'bullet_list', content: '' },
      { type: 'heading', content: 'Prochaines étapes' },
      { type: 'todo', content: '' }
    ]
  },
  {
    id: 'weekly-review',
    name: 'Revue hebdomadaire',
    description: 'Bilan et planification de la semaine',
    icon: <Calendar size={18} />,
    category: 'productivity',
    structure: [
      { type: 'heading', content: '📊 Semaine du [Date]' },
      { type: 'heading', content: 'Accomplissements' },
      { type: 'bullet_list', content: '' },
      { type: 'heading', content: 'Défis rencontrés' },
      { type: 'bullet_list', content: '' },
      { type: 'heading', content: 'Objectifs semaine prochaine' },
      { type: 'todo', content: '' }
    ]
  },
  {
    id: 'course-notes',
    name: 'Notes de cours',
    description: 'Structure pour prendre des notes de cours',
    icon: <BookOpen size={18} />,
    category: 'personal',
    structure: [
      { type: 'heading', content: '📚 [Nom du cours] - [Date]' },
      { type: 'heading', content: 'Points clés' },
      { type: 'bullet_list', content: '' },
      { type: 'heading', content: 'Notes détaillées' },
      { type: 'paragraph', content: '' },
      { type: 'heading', content: 'Questions' },
      { type: 'bullet_list', content: '' },
      { type: 'heading', content: 'À réviser' },
      { type: 'todo', content: '' }
    ]
  },
  {
    id: 'goal-tracker',
    name: 'Suivi d\'objectif',
    description: 'Définir et suivre un objectif SMART',
    icon: <Target size={18} />,
    category: 'productivity',
    isPremium: true,
    structure: [
      { type: 'heading', content: '🎯 Objectif: [Titre]' },
      { type: 'callout', content: '📅 Échéance: ' },
      { type: 'heading', content: 'Pourquoi cet objectif ?' },
      { type: 'paragraph', content: '' },
      { type: 'heading', content: 'Étapes clés' },
      { type: 'todo', content: '' },
      { type: 'heading', content: 'Métriques de succès' },
      { type: 'bullet_list', content: '' },
      { type: 'heading', content: 'Obstacles potentiels' },
      { type: 'bullet_list', content: '' }
    ]
  }
];

const categoryIcons: Record<string, React.ReactNode> = {
  basic: <FileText size={14} />,
  productivity: <Target size={14} />,
  work: <Briefcase size={14} />,
  personal: <BookOpen size={14} />
};

export function TemplateSelector({
  onSelectTemplate,
  onCreateCustom,
  recentTemplates = [],
  className = ''
}: TemplateSelectorProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  // Traductions avec fallbacks (cast pour contourner le typage strict)
  const tr = t as (key: string, fallback?: string) => string;
  const texts = {
    title: tr('templates.title', 'Templates'),
    subtitle: tr('templates.subtitle', 'Structurez votre contenu'),
    searchPlaceholder: tr('templates.searchPlaceholder', 'Rechercher un template...'),
    all: tr('templates.all', 'Tous'),
    recent: tr('templates.recent', 'Récents'),
    noResults: tr('templates.noResults', 'Aucun template trouvé'),
    createCustom: tr('templates.createCustom', 'Créer un template personnalisé'),
    categories: {
      basic: tr('templates.categories.basic', 'Basique'),
      productivity: tr('templates.categories.productivity', 'Productivité'),
      work: tr('templates.categories.work', 'Travail'),
      personal: tr('templates.categories.personal', 'Personnel'),
    }
  };

  // Filtrer les templates
  const filteredTemplates = useMemo(() => {
    let templates = defaultTemplates;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory) {
      templates = templates.filter(t => t.category === selectedCategory);
    }
    
    return templates;
  }, [searchQuery, selectedCategory]);

  // Templates récents
  const recentTemplatesList = useMemo(() => {
    return recentTemplates
      .map(id => defaultTemplates.find(t => t.id === id))
      .filter(Boolean) as Template[];
  }, [recentTemplates]);

  // Grouper par catégorie
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, Template[]> = {};
    filteredTemplates.forEach(template => {
      if (!groups[template.category]) {
        groups[template.category] = [];
      }
      groups[template.category].push(template);
    });
    return groups;
  }, [filteredTemplates]);

  return (
    <div className={`bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {texts.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {texts.subtitle}
            </p>
          </div>
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={texts.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
        </div>

        {/* Filtres catégories */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              !selectedCategory
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {texts.all}
          </button>
          {Object.entries(texts.categories).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedCategory === key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {categoryIcons[key]}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      <div className="max-h-80 overflow-y-auto">
        {/* Templates récents */}
        {!searchQuery && !selectedCategory && recentTemplatesList.length > 0 && (
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Clock size={12} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {texts.recent}
              </span>
            </div>
            <div className="space-y-1">
              {recentTemplatesList.slice(0, 3).map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  isHovered={hoveredTemplate === template.id}
                  onHover={setHoveredTemplate}
                  onSelect={onSelectTemplate}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Templates groupés */}
        {selectedCategory ? (
          <div className="p-3">
            <div className="space-y-1">
              {filteredTemplates.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  isHovered={hoveredTemplate === template.id}
                  onHover={setHoveredTemplate}
                  onSelect={onSelectTemplate}
                />
              ))}
            </div>
          </div>
        ) : (
          Object.entries(groupedTemplates).map(([category, templates]) => (
            <div key={category} className="p-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
              <div className="flex items-center gap-2 mb-2 px-1">
                {categoryIcons[category]}
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {texts.categories[category as keyof typeof texts.categories] || category}
                </span>
              </div>
              <div className="space-y-1">
                {templates.map((template) => (
                  <TemplateItem
                    key={template.id}
                    template={template}
                    isHovered={hoveredTemplate === template.id}
                    onHover={setHoveredTemplate}
                    onSelect={onSelectTemplate}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {/* Aucun résultat */}
        {filteredTemplates.length === 0 && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Search size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {texts.noResults}
            </p>
          </div>
        )}
      </div>

      {/* Footer - Créer un template */}
      {onCreateCustom && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onCreateCustom}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>{texts.createCustom}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Composant item de template
function TemplateItem({
  template,
  isHovered,
  onHover,
  onSelect,
  compact = false
}: {
  template: Template;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (template: Template) => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(template)}
      onMouseEnter={() => onHover(template.id)}
      onMouseLeave={() => onHover(null)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
        isHovered
          ? 'bg-purple-50 dark:bg-purple-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
        isHovered
          ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
      }`}>
        {template.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {template.name}
          </span>
          {template.isNew && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
              NEW
            </span>
          )}
          {template.isPremium && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-600 dark:text-purple-400 rounded">
              PRO
            </span>
          )}
        </div>
        {!compact && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {template.description}
          </p>
        )}
      </div>
      
      <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${
        isHovered ? 'text-purple-500' : 'text-gray-300 dark:text-gray-600'
      }`} />
    </button>
  );
}
