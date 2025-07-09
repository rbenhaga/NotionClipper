import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Type, Hash, Calendar, Link, Mail, Phone, List, CheckSquare,
  FileText, Tag, Clock, User, Loader, AlertCircle, ChevronDown, Database
} from 'lucide-react';
import axios from 'axios';

// Icône selon le type de propriété
const PropertyIcon = ({ type }) => {
  const icons = {
    title: Type,
    rich_text: FileText,
    number: Hash,
    select: List,
    multi_select: Tag,
    date: Calendar,
    checkbox: CheckSquare,
    url: Link,
    email: Mail,
    phone_number: Phone,
    people: User,
    files: FileText,
    created_time: Clock,
    status: List
  };
  
  const Icon = icons[type] || FileText;
  return <Icon size={14} />;
};

// Composant pour un champ de propriété
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
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white"
          placeholder={`Entrez ${name.toLowerCase()}`}
        />
      );
      
    case 'number':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value ? parseFloat(e.target.value) : null)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white"
          placeholder="0"
          step="any"
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
          <span className="text-sm text-notion-gray-700">Activé</span>
        </label>
      );
      
    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Sélectionner...</option>
          {options?.map(opt => (
            <option key={opt.id || opt.name} value={opt.name}>
              {opt.color && (
                <span className={`inline-block w-2 h-2 rounded-full mr-2 bg-${opt.color}-500`} />
              )}
              {opt.name}
            </option>
          ))}
        </select>
      );
      
    case 'multi_select':
      return (
        <div>
          <input
            type="text"
            value={Array.isArray(value) ? value.join(', ') : value || ''}
            onChange={(e) => {
              const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
              onChange(name, values);
            }}
            className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white"
            placeholder="Tag1, Tag2, Tag3"
          />
          {options && options.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {options.map(opt => (
                <button
                  key={opt.id || opt.name}
                  type="button"
                  onClick={() => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (currentValues.includes(opt.name)) {
                      onChange(name, currentValues.filter(v => v !== opt.name));
                    } else {
                      onChange(name, [...currentValues, opt.name]);
                    }
                  }}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    (Array.isArray(value) ? value : []).includes(opt.name)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          )}
        </div>
      );
      
    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white"
        />
      );
      
    case 'url':
      return (
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white"
          placeholder="https://example.com"
        />
      );
      
    case 'email':
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white"
          placeholder="email@example.com"
        />
      );
      
    case 'phone_number':
      return (
        <input
          type="tel"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white"
          placeholder="+33 6 12 34 56 78"
        />
      );
      
    case 'status':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Sélectionner un statut...</option>
          {options?.map(opt => (
            <option key={opt.id || opt.name} value={opt.name}>
              {opt.name}
            </option>
          ))}
        </select>
      );
      
    case 'formula':
    case 'rollup':
    case 'created_time':
    case 'created_by':
    case 'last_edited_time':
    case 'last_edited_by':
      return (
        <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500">
          <span className="italic">Propriété en lecture seule</span>
        </div>
      );
      
    default:
      return (
        <div className="px-3 py-2 bg-amber-50 rounded-lg text-sm text-amber-700">
          Type non supporté: {type}
        </div>
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
  const readOnlyTypes = ['formula', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by'];
  
  useEffect(() => {
    if (!selectedPage || selectedPage.parent?.type !== 'database_id') {
      setDatabaseSchema(null);
      return;
    }
    
    fetchDatabaseSchema();
  }, [selectedPage]);
  
  const fetchDatabaseSchema = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Récupérer les infos de type de la page
      const response = await axios.get(
        `http://localhost:5000/api/pages/${selectedPage.id}/type-info`
      );
      
      if (response.data.type === 'database_item') {
        setDatabaseSchema(response.data.properties);
        
        // Initialiser avec les valeurs actuelles si disponibles
        if (response.data.current_values) {
          const extractedValues = {};
          Object.entries(response.data.current_values).forEach(([key, value]) => {
            // Extraire la valeur selon le type
            if (value.title?.[0]?.plain_text) {
              extractedValues[key] = value.title[0].plain_text;
            } else if (value.rich_text?.[0]?.plain_text) {
              extractedValues[key] = value.rich_text[0].plain_text;
            } else if (value.number !== undefined) {
              extractedValues[key] = value.number;
            } else if (value.checkbox !== undefined) {
              extractedValues[key] = value.checkbox;
            } else if (value.select?.name) {
              extractedValues[key] = value.select.name;
            } else if (value.multi_select) {
              extractedValues[key] = value.multi_select.map(s => s.name);
            } else if (value.date?.start) {
              extractedValues[key] = value.date.start;
            } else if (value.url) {
              extractedValues[key] = value.url;
            } else if (value.email) {
              extractedValues[key] = value.email;
            } else if (value.phone_number) {
              extractedValues[key] = value.phone_number;
            } else if (value.status?.name) {
              extractedValues[key] = value.status.name;
            }
          });
          setProperties(extractedValues);
        }
      }
    } catch (err) {
      console.error('Erreur récupération schéma:', err);
      setError('Impossible de récupérer les propriétés de la base de données');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePropertyChange = (propName, value) => {
    const updated = { ...properties, [propName]: value };
    setProperties(updated);
    
    // Notifier le parent
    onUpdateProperties({
      databaseProperties: updated
    });
  };
  
  if (!selectedPage || selectedPage.parent?.type !== 'database_id') {
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
    .filter(([_, config]) => !readOnlyTypes.includes(config.type))
    .sort(([_, a], [__, b]) => {
      // Titre en premier
      if (a.type === 'title') return -1;
      if (b.type === 'title') return 1;
      return 0;
    });
  
  if (editableProperties.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        Aucune propriété modifiable dans cette base de données.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* En-tête avec toggle */}
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
      
      {/* Propriétés */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          {editableProperties.map(([propName, propConfig]) => (
            <div key={propName} className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-notion-gray-700">
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
      
      {/* Note informative */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          💡 Ces propriétés correspondent exactement à votre base de données Notion.
          Les modifications seront appliquées lors de l'envoi.
        </p>
      </div>
    </div>
  );
} 