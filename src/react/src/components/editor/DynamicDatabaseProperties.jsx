import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, ChevronDown, AlertCircle, Loader,
  Type, Hash, Calendar, CheckSquare, List, Link, Mail, Phone
} from 'lucide-react';

// Icône selon le type de propriété
const PropertyIcon = ({ type }) => {
  const icons = {
    'title': Type,
    'rich_text': Type,
    'number': Hash,
    'date': Calendar,
    'checkbox': CheckSquare,
    'select': List,
    'multi_select': List,
    'url': Link,
    'email': Mail,
    'phone_number': Phone
  };
  
  const Icon = icons[type] || Type;
  return <Icon size={14} className="text-gray-500" />;
};

// Champ de propriété selon le type
const PropertyField = ({ property, value, onChange, schema }) => {
  const { name, type, options } = schema;
  
  switch (type) {
    case 'title':
    case 'rich_text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={type === 'title' ? 'Titre de la page' : 'Texte...'}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value || 0}
          onChange={(e) => onChange(name, parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(name, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{value ? 'Activé' : 'Désactivé'}</span>
        </label>
      );

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case 'select':
      // Si on a des options, les afficher dans un select
      if (options && options.length > 0) {
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value)}
            className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sélectionner...</option>
            {options.map(opt => (
              <option 
                key={opt.id || opt.name} 
                value={opt.name}
                style={{ color: opt.color ? `var(--notion-${opt.color})`  : 'inherit' }}
              >
                {opt.name}
              </option>
            ))}
          </select>
        );
      }
      // Sinon, champ texte avec suggestion
      return (
        <div className="relative">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value)}
            className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Entrez une valeur..."
          />
          <div className="text-xs text-gray-500 mt-1">
            💡 Nouvelle option sera créée si elle n'existe pas
          </div>
        </div>
      );

    case 'multi_select':
      // Si on a des options, créer des chips cliquables
      if (options && options.length > 0) {
        const selectedValues = value 
          ? (typeof value === 'string' ? value.split(',').map(v => v.trim()) : value)
          : [];
        
        return (
          <div className="space-y-2">
            {/* Options disponibles */}
            <div className="flex flex-wrap gap-1">
              {options.map(opt => {
                const isSelected = selectedValues.includes(opt.name);
                return (
                  <button
                    key={opt.id || opt.name}
                    type="button"
                    onClick={() => {
                      let newValues;
                      if (isSelected) {
                        newValues = selectedValues.filter(v => v !== opt.name);
                      } else {
                        newValues = [...selectedValues, opt.name];
                      }
                      onChange(name, newValues.join(', '));
                    }}
                    className={`
                      px-2 py-1 rounded-full text-xs transition-all
                      ${isSelected 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                    `}
                    style={{
                      backgroundColor: isSelected && opt.color 
                        ? `var(--notion-${opt.color})` 
                        : undefined
                    }}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>
            
            {/* Champ pour ajouter de nouvelles valeurs */}
            <input
              type="text"
              value=""
              onChange={(e) => {
                if (e.target.value.includes(',')) {
                  const newValue = e.target.value.replace(',', '').trim();
                  if (newValue && !selectedValues.includes(newValue)) {
                    onChange(name, [...selectedValues, newValue].join(', '));
                    e.target.value = '';
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const newValue = e.target.value.trim();
                  if (newValue && !selectedValues.includes(newValue)) {
                    onChange(name, [...selectedValues, newValue].join(', '));
                    e.target.value = '';
                  }
                }
              }}
              className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ajouter une nouvelle valeur..."
            />
            
            {selectedValues.length > 0 && (
              <div className="text-xs text-gray-600">
                Sélectionnées : {selectedValues.join(', ')}
              </div>
            )}
          </div>
        );
      }
      
      // Sinon, champ texte simple
      return (
        <div>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value)}
            className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Valeurs séparées par des virgules..."
          />
          <div className="text-xs text-gray-500 mt-1">
            💡 Séparez les valeurs par des virgules
          </div>
        </div>
      );

    case 'status':
      // Status avec options colorées
      if (options && options.length > 0) {
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value)}
            className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sélectionner un statut...</option>
            {options.map(opt => (
              <option 
                key={opt.id || opt.name} 
                value={opt.name}
              >
                {opt.name}
              </option>
            ))}
          </select>
        );
      }
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Entrez un statut..."
        />
      );

    case 'url':
      return (
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://..."
        />
      );

    case 'email':
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="email@example.com"
        />
      );

    case 'phone_number':
      return (
        <input
          type="tel"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+33 6 12 34 56 78"
        />
      );

    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`${type} (non supporté)`}
        />
      );
  }
};

export default function DynamicDatabaseProperties({ selectedPage, onUpdateProperties }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [databaseSchema, setDatabaseSchema] = useState(null);
  const [properties, setProperties] = useState({});
  const [expanded, setExpanded] = useState(true);

  // Propriétés en lecture seule à ignorer
  const readOnlyTypes = ['formula', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by', 'files'];

  useEffect(() => {
    const loadDatabaseInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        if (window.electronAPI && window.electronAPI.getPageInfo) {
          const result = await window.electronAPI.getPageInfo(selectedPage.id);
          console.log('📊 Page info result:', result);

          if (result.success && result.pageInfo) {
            // Utiliser le schéma inféré ou les propriétés directes
            let schema = null;
            
            if (result.pageInfo.database && result.pageInfo.database.properties) {
              schema = result.pageInfo.database.properties;
            } else if (result.pageInfo.properties) {
              // Créer un schéma depuis les propriétés de la page
              schema = {};
              Object.entries(result.pageInfo.properties).forEach(([key, prop]) => {
                schema[key] = {
                  name: key,
                  type: prop.type,
                  options: null // On ne peut pas récupérer les options depuis la page
                };
              });
            }

            if (schema && Object.keys(schema).length > 0) {
              setDatabaseSchema(schema);
              
              // Initialiser avec les valeurs existantes
              const existingValues = {};
              const pageProps = result.pageInfo.properties || {};
              
              Object.entries(schema).forEach(([key, schemaProp]) => {
                const pageProp = pageProps[key];
                
                if (!pageProp) {
                  existingValues[key] = '';
                  return;
                }
                
                switch (schemaProp.type) {
                  case 'title':
                    existingValues[key] = pageProp.title?.[0]?.plain_text || '';
                    break;
                  case 'rich_text':
                    existingValues[key] = pageProp.rich_text?.[0]?.plain_text || '';
                    break;
                  case 'number':
                    existingValues[key] = pageProp.number || 0;
                    break;
                  case 'checkbox':
                    existingValues[key] = pageProp.checkbox || false;
                    break;
                  case 'select':
                    existingValues[key] = pageProp.select?.name || '';
                    break;
                  case 'multi_select':
                    existingValues[key] = pageProp.multi_select?.map(s => s.name).join(', ') || '';
                    break;
                  case 'date':
                    existingValues[key] = pageProp.date?.start || '';
                    break;
                  case 'url':
                    existingValues[key] = pageProp.url || '';
                    break;
                  case 'email':
                    existingValues[key] = pageProp.email || '';
                    break;
                  case 'phone_number':
                    existingValues[key] = pageProp.phone_number || '';
                    break;
                  default:
                    existingValues[key] = '';
                }
              });
              
              setProperties(existingValues);
            } else {
              setError('Aucune propriété trouvée pour cette page');
            }
          }
        }
      } catch (err) {
        console.error('Erreur chargement propriétés:', err);
        setError('Erreur: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (selectedPage && 
        (selectedPage.parent?.type === 'database_id' || 
         selectedPage.parent?.type === 'data_source_id')) {
      loadDatabaseInfo();
    }
  }, [selectedPage]);

  const handlePropertyChange = (propName, value) => {
    const updated = { ...properties, [propName]: value };
    setProperties(updated);
    onUpdateProperties({ databaseProperties: updated });
  };

  // Ne rien afficher si pas une page de database
  if (!selectedPage?.parent || 
      (selectedPage.parent.type !== 'database_id' && 
       selectedPage.parent.type !== 'data_source_id')) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4">
        <Loader className="animate-spin" size={16} />
        <span className="text-sm text-gray-600">Chargement des propriétés...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg flex items-start gap-2">
        <AlertCircle size={16} className="text-red-600 mt-0.5" />
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!databaseSchema) {
    return null;
  }

  // Filtrer et trier les propriétés
  const editableProperties = Object.entries(databaseSchema)
    .filter(([_, config]) => config && !readOnlyTypes.includes(config.type))
    .sort(([_, a], [__, b]) => {
      if (a?.type === 'title') return -1;
      if (b?.type === 'title') return 1;
      return 0;
    });

  if (editableProperties.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        Aucune propriété modifiable trouvée.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            Propriétés de la base de données ({editableProperties.length})
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-blue-600 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          {editableProperties.map(([propName, propConfig]) => (
            <div key={propName} className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <PropertyIcon type={propConfig.type} />
                {propConfig.name || propName}
                {propConfig.type === 'title' && (
                  <span className="text-xs text-red-500">*</span>
                )}
              </label>
              <PropertyField
                property={propName}
                value={properties[propName]}
                onChange={handlePropertyChange}
                schema={propConfig}
              />
            </div>
          ))}
        </motion.div>
      )}

      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          {databaseSchema && Object.values(databaseSchema).some(s => s.options?.length > 0)
            ? '✅ Options de sélection récupérées depuis votre base de données Notion'
            : '💡 Les propriétés ont été détectées. Les options de sélection seront créées si nécessaires.'
          }
        </p>
      </div>
    </div>
  );
}