import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Type, Hash, Calendar, Link, Mail, Phone, 
  Tag, FileText, ChevronDown, X, Check, Globe, AlertCircle
} from 'lucide-react';

// Couleurs Notion authentiques
const NOTION_COLORS = {
  default: '#9CA3AF',
  gray: '#787774',
  brown: '#9F6B53',
  orange: '#D9730D',
  yellow: '#CB912F',
  green: '#0F7B6C',
  blue: '#0B6E99',
  purple: '#6940A5',
  pink: '#AD1A72',
  red: '#E03E3E'
};

export default function DynamicDatabaseProperties({ 
  selectedPage,        // Page avec valeurs actuelles
  databaseSchema,      // Schema de la DB avec options disponibles
  multiSelectMode, 
  onUpdateProperties 
}) {
  const [properties, setProperties] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  
  useEffect(() => {
    if (selectedPage?.properties) {
      const initialProps = {};
      Object.entries(selectedPage.properties).forEach(([key, prop]) => {
        if (prop.type && key !== 'title') {
          initialProps[key] = extractPropertyValue(prop);
        }
      });
      setProperties(initialProps);
    }
  }, [selectedPage]);

  const extractPropertyValue = (prop) => {
    switch (prop.type) {
      case 'rich_text':
        return prop.rich_text?.[0]?.plain_text || '';
      case 'number':
        return prop.number || '';
      case 'checkbox':
        return prop.checkbox || false;
      case 'select':
        return prop.select?.name || null;
      case 'multi_select':
        return prop.multi_select?.map(item => item.name) || [];
      case 'date':
        return prop.date?.start || '';
      case 'url':
        return prop.url || '';
      case 'email':
        return prop.email || '';
      case 'phone_number':
        return prop.phone_number || '';
      default:
        return '';
    }
  };

  const handlePropertyChange = (key, value) => {
    const newProps = { ...properties, [key]: value };
    setProperties(newProps);
    onUpdateProperties({ databaseProperties: newProps });
  };

  const toggleDropdown = (key) => {
    setOpenDropdowns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderProperty = (key, pageProp, schemaProp) => {
    const value = properties[key] ?? extractPropertyValue(pageProp);

    switch (pageProp.type) {
      case 'rich_text':
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Type size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
              placeholder={`Saisir ${schemaProp?.name?.toLowerCase() || key}...`}
            />
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Hash size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
              placeholder="0"
            />
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              {schemaProp?.name || key}
            </label>
            <button
              onClick={() => handlePropertyChange(key, !value)}
              className="flex items-center justify-between w-full p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all group"
            >
              <span className={`text-sm ${value ? 'text-gray-900' : 'text-gray-500'}`}>
                {value ? 'Activé' : 'Désactivé'}
              </span>
              <motion.div
                initial={false}
                animate={{ backgroundColor: value ? '#18181b' : '#e5e7eb' }}
                className="relative w-10 h-5 rounded-full transition-colors"
              >
                <motion.div
                  initial={false}
                  animate={{ x: value ? 20 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </motion.div>
            </button>
          </div>
        );

      case 'select':
        const isOpen = openDropdowns[key];
        // Récupérer les options du schema de la DB
        const options = schemaProp?.select?.options || [];
        const selectedOption = options.find(o => o.name === value);
        
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Tag size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            
            <div className="relative">
              <button
                onClick={() => toggleDropdown(key)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-left flex items-center justify-between hover:bg-gray-50 transition-all focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                {value ? (
                  <span 
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{ 
                      backgroundColor: `${NOTION_COLORS[selectedOption?.color || 'default']}15`,
                      color: NOTION_COLORS[selectedOption?.color || 'default']
                    }}
                  >
                    {value}
                  </span>
                ) : (
                  <span className="text-gray-400">Sélectionner...</span>
                )}
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => toggleDropdown(key)} />
                    
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {value && (
                        <button
                          onClick={() => {
                            handlePropertyChange(key, null);
                            toggleDropdown(key);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100 flex items-center gap-2"
                        >
                          <X size={12} />
                          Aucune sélection
                        </button>
                      )}
                      
                      {options.map(option => (
                        <button
                          key={option.id}
                          onClick={() => {
                            handlePropertyChange(key, option.name);
                            toggleDropdown(key);
                          }}
                          className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                            value === option.name ? 'bg-gray-50' : ''
                          }`}
                        >
                          <span 
                            className="px-2.5 py-1 rounded-md text-xs font-medium flex-1"
                            style={{ 
                              backgroundColor: `${NOTION_COLORS[option.color || 'default']}15`,
                              color: NOTION_COLORS[option.color || 'default']
                            }}
                          >
                            {option.name}
                          </span>
                          {value === option.name && (
                            <Check size={14} className="text-gray-900" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        );

      case 'multi_select':
        const isMultiOpen = openDropdowns[key];
        // Récupérer les options du schema de la DB
        const multiOptions = schemaProp?.multi_select?.options || [];
        
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Tag size={12} className="text-gray-400" />
              {schemaProp?.name || key}
              {value.length > 0 && (
                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {value.length}
                </span>
              )}
            </label>
            
            {/* Chips sélectionnés */}
            {value.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50/50 rounded-lg border border-gray-100">
                <AnimatePresence>
                  {value.map((item, index) => {
                    const option = multiOptions.find(o => o.name === item);
                    return (
                      <motion.span
                        key={index}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                        style={{ 
                          backgroundColor: `${NOTION_COLORS[option?.color || 'default']}15`,
                          color: NOTION_COLORS[option?.color || 'default']
                        }}
                      >
                        {item}
                        <button
                          onClick={() => {
                            const newValue = value.filter((_, i) => i !== index);
                            handlePropertyChange(key, newValue);
                          }}
                          className="hover:opacity-70 transition-opacity"
                        >
                          <X size={11} strokeWidth={2.5} />
                        </button>
                      </motion.span>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown(key)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-left flex items-center justify-between hover:bg-gray-50 transition-all focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <span className="text-gray-400">
                  {value.length > 0 ? 'Ajouter une option...' : 'Sélectionner...'}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isMultiOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isMultiOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => toggleDropdown(key)} />
                    
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {multiOptions.map(option => {
                        const isSelected = value.includes(option.name);
                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              const newValue = isSelected
                                ? value.filter(v => v !== option.name)
                                : [...value, option.name];
                              handlePropertyChange(key, newValue);
                            }}
                            className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2.5 ${
                              isSelected ? 'bg-gray-50' : ''
                            }`}
                          >
                            <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all flex-shrink-0 ${
                              isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check size={10} strokeWidth={3} className="text-white" />}
                            </div>
                            <span 
                              className="px-2.5 py-1 rounded-md text-xs font-medium flex-1"
                              style={{ 
                                backgroundColor: `${NOTION_COLORS[option.color || 'default']}15`,
                                color: NOTION_COLORS[option.color || 'default']
                              }}
                            >
                              {option.name}
                            </span>
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Calendar size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={value || ''}
                onChange={(e) => handlePropertyChange(key, e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all"
              />
              {!value && (
                <button
                  onClick={() => handlePropertyChange(key, new Date().toISOString().split('T')[0])}
                  className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                >
                  Aujourd'hui
                </button>
              )}
              {value && (
                <button
                  onClick={() => handlePropertyChange(key, '')}
                  className="px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X size={14} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>
        );

      case 'url':
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Link size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <div className="relative">
              <input
                type="url"
                value={value}
                onChange={(e) => handlePropertyChange(key, e.target.value)}
                className="w-full px-3 py-2 pr-9 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
                placeholder="https://..."
              />
              {value && (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <Globe size={15} />
                </a>
              )}
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Mail size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="email"
              value={value}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
              placeholder="email@exemple.com"
            />
          </div>
        );

      case 'phone_number':
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Phone size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="tel"
              value={value}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
              placeholder="+33 6 12 34 56 78"
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <FileText size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
              placeholder={`Saisir ${schemaProp?.name?.toLowerCase() || key}...`}
            />
          </div>
        );
    }
  };

  if (!selectedPage || multiSelectMode) {
    return (
      <div className="text-center py-8">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
          <Tag size={16} className="text-gray-400" />
        </div>
        <p className="text-xs text-gray-500">
          {multiSelectMode 
            ? "Non disponible en multi-sélection" 
            : "Sélectionnez une page de base de données"}
        </p>
      </div>
    );
  }

  if (!databaseSchema) {
    return (
      <div className="text-center py-8">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-3">
          <AlertCircle size={16} className="text-amber-600" />
        </div>
        <p className="text-xs text-amber-600 font-medium">Schema de DB manquant</p>
        <p className="text-xs text-gray-500 mt-1">
          Passez databaseSchema en prop
        </p>
      </div>
    );
  }

  // Utiliser l'ordre du schema si disponible, sinon ordre alphabétique
  const allProperties = Object.entries(selectedPage.properties || {})
    .filter(([key]) => key !== 'title')
    .sort((a, b) => {
      // Si le schema a un ordre, l'utiliser
      const aSchema = databaseSchema.properties?.[a[0]];
      const bSchema = databaseSchema.properties?.[b[0]];
      if (aSchema?.id && bSchema?.id) {
        return aSchema.id.localeCompare(bSchema.id);
      }
      return a[0].localeCompare(b[0]);
    });

  return (
    <div className="space-y-3">
      {allProperties.map(([key, pageProp]) => {
        const schemaProp = databaseSchema.properties?.[key];
        return (
          <div key={key}>
            {renderProperty(key, pageProp, schemaProp)}
          </div>
        );
      })}

      {allProperties.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Aucune propriété</p>
          <p className="text-xs text-gray-400 mt-1">
            Ajoutez des propriétés dans Notion
          </p>
        </div>
      )}
    </div>
  );
}