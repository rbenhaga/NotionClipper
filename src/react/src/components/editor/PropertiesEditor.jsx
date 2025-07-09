import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, Calendar, Link, Mail, Phone, Type, List, CheckSquare,
  FileText, Image, Archive, Loader, AlertCircle, Database,
  Sparkles, Tag, Clock, User
} from 'lucide-react';
import axios from 'axios';

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
    icon: Sparkles,
    cover: Image,
    archived: Archive
  };
  
  const Icon = icons[type] || FileText;
  return <Icon size={16} />;
};

export default function PropertiesEditor({ 
  selectedPage, 
  onUpdateProperties,
  currentProperties = {}
}) {
  const [isDatabase, setIsDatabase] = useState(false);
  const [databaseProperties, setDatabaseProperties] = useState({});
  const [loading, setLoading] = useState(false);
  const [localProperties, setLocalProperties] = useState(currentProperties);
  
  // Vérifier si la page est dans une base de données
  useEffect(() => {
    if (!selectedPage) return;
    
    const checkPageType = async () => {
      setLoading(true);
      try {
        // Vérifier si c'est une base de données
        const response = await axios.get(
          `http://localhost:5000/api/pages/${selectedPage.id}/check-database`
        );
        
        if (response.data.is_database) {
          setIsDatabase(true);
          setDatabaseProperties(response.data.properties || {});
        } else {
          // Vérifier si la page parente est une base de données
          if (selectedPage.parent?.type === 'database_id') {
            setIsDatabase(true);
            // Récupérer les propriétés de la base de données parente
            const dbResponse = await axios.get(
              `http://localhost:5000/api/pages/${selectedPage.parent.database_id}/check-database`
            );
            setDatabaseProperties(dbResponse.data.properties || {});
          } else {
            setIsDatabase(false);
            setDatabaseProperties({});
          }
        }
      } catch (error) {
        console.error('Erreur vérification type page:', error);
        setIsDatabase(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkPageType();
  }, [selectedPage]);
  
  // Propriétés pour pages simples
  const simplePageProperties = [
    {
      key: 'icon',
      label: 'Icône',
      type: 'emoji',
      placeholder: '📄',
      description: 'Emoji ou URL d\'image'
    },
    {
      key: 'cover',
      label: 'Couverture',
      type: 'url',
      placeholder: 'https://example.com/image.jpg',
      description: 'URL de l\'image de couverture'
    }
  ];
  
  // Gérer les changements
  const handlePropertyChange = (key, value, type) => {
    const updated = { ...localProperties };
    
    // Formatter selon le type
    switch (type) {
      case 'multi_select':
        updated[key] = value.split(',').map(v => v.trim()).filter(Boolean);
        break;
      case 'checkbox':
        updated[key] = Boolean(value);
        break;
      case 'number':
        updated[key] = parseFloat(value) || 0;
        break;
      case 'date':
        updated[key] = value;
        break;
      default:
        updated[key] = value;
    }
    
    setLocalProperties(updated);
    onUpdateProperties(updated);
  };
  
  // Render une propriété
  const renderProperty = (prop) => {
    const { key, label, type, placeholder, description, options } = prop;
    const value = localProperties[key] || '';
    
    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
      >
        <div className="flex items-center gap-2 mb-2">
          <PropertyIcon type={type} />
          <label className="text-sm font-medium text-gray-700">{label}</label>
          {description && (
            <span className="text-xs text-gray-500 ml-auto">{description}</span>
          )}
        </div>
        
        {/* Input selon le type */}
        {type === 'checkbox' ? (
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => handlePropertyChange(key, e.target.checked, type)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        ) : type === 'select' && options ? (
          <select
            value={value}
            onChange={(e) => handlePropertyChange(key, e.target.value, type)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sélectionner...</option>
            {options.map(opt => (
              <option key={opt.id} value={opt.name}>{opt.name}</option>
            ))}
          </select>
        ) : type === 'multi_select' ? (
          <input
            type="text"
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={(e) => handlePropertyChange(key, e.target.value, type)}
            placeholder={placeholder || "Tag1, Tag2, Tag3"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        ) : type === 'number' ? (
          <input
            type="number"
            value={value}
            onChange={(e) => handlePropertyChange(key, e.target.value, type)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        ) : type === 'date' ? (
          <input
            type="date"
            value={value}
            onChange={(e) => handlePropertyChange(key, e.target.value, type)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => handlePropertyChange(key, e.target.value, type)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        )}
      </motion.div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin text-blue-600" size={24} />
        <span className="ml-2 text-gray-600">Chargement des propriétés...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Database size={20} />
          Propriétés Notion
        </h3>
        {isDatabase && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            Page de base de données
          </span>
        )}
      </div>
      
      {/* Message d'information */}
      {!isDatabase && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Page simple détectée</p>
            <p>Cette page n'est pas dans une base de données. Seules les propriétés de base (icône et couverture) sont disponibles.</p>
          </div>
        </div>
      )}
      
      {/* Propriétés disponibles */}
      <div className="grid gap-3">
        {isDatabase ? (
          // Afficher les propriétés de la base de données
          Object.entries(databaseProperties).map(([key, prop]) => {
            // Ignorer les propriétés système en lecture seule
            if (['created_time', 'created_by', 'last_edited_time', 'last_edited_by', 'formula', 'rollup'].includes(prop.type)) {
              return null;
            }
            
            return renderProperty({
              key,
              label: prop.name || key,
              type: prop.type,
              options: prop.select?.options || prop.multi_select?.options,
              description: prop.description
            });
          }).filter(Boolean)
        ) : (
          // Afficher seulement les propriétés simples
          simplePageProperties.map(prop => renderProperty(prop))
        )}
      </div>
      
      {/* Propriétés personnalisées toujours disponibles */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Métadonnées personnalisées</h4>
        <div className="grid gap-3">
          {renderProperty({
            key: 'custom_tags',
            label: 'Tags personnalisés',
            type: 'multi_select',
            placeholder: 'Important, À revoir, Archive',
            description: 'Séparés par des virgules'
          })}
          {renderProperty({
            key: 'custom_source',
            label: 'Source',
            type: 'url',
            placeholder: 'https://source.com',
            description: 'URL de la source originale'
          })}
        </div>
      </div>
    </div>
  );
} 