import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Type, Hash, Calendar, Link, Mail, Phone, 
  Tag, FileText, ChevronDown, X, Check, Globe, AlertCircle, Plus
} from 'lucide-react';

// ✅ VRAIES COULEURS NOTION (vérifiées)
const NOTION_COLORS = {
  default: { bg: '#e9e9e7', text: '#787774' },
  gray: { bg: '#e3e2e0', text: '#9b9a97' },
  brown: { bg: '#eee0da', text: '#64473a' },
  orange: { bg: '#fadec9', text: '#d9730d' },
  yellow: { bg: '#fdecc8', text: '#dfab01' },
  green: { bg: '#dbeddb', text: '#4d6461' },
  blue: { bg: '#d3e5ef', text: '#0b6e99' },
  purple: { bg: '#e8deee', text: '#6940a5' },
  pink: { bg: '#f5e0e9', text: '#ad1a72' },
  red: { bg: '#ffe2dd', text: '#e03e3e' }
};

export default function DynamicDatabaseProperties({ 
  selectedPage,
  databaseSchema,
  multiSelectMode, 
  onUpdateProperties 
}) {
  // eslint-disable-next-line no-console
  console.log('🔍 DynamicDatabaseProperties - selectedPage:', selectedPage);
  // eslint-disable-next-line no-console
  console.log('🔍 DynamicDatabaseProperties - databaseSchema:', databaseSchema);

  const [properties, setProperties] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [searchInputs, setSearchInputs] = useState({});
  const [dropdownPositions, setDropdownPositions] = useState({});
  const dropdownRefs = useRef({});
  const [dropdownStyles, setDropdownStyles] = useState({});
  
  const extractPropertyValue = React.useCallback((prop) => {
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
      case 'status':
        return prop.status?.name || null;
      default:
        return '';
    }
  }, []);
  
  useEffect(() => {
    if (selectedPage?.properties) {
      const initialProps = {};
      Object.entries(selectedPage.properties).forEach(([key, prop]) => {
        if (prop.type && key !== 'title') {
          const extracted = extractPropertyValue(prop);
          initialProps[key] = extracted;
          // eslint-disable-next-line no-console
          console.log(`📊 Propriété ${key} (${prop.type}):`, extracted);
        }
      });
      setProperties(initialProps);
    }
  }, [selectedPage, extractPropertyValue]);

  const handlePropertyChange = (key, value) => {
    const newProps = { ...properties, [key]: value };
    setProperties(newProps);
    onUpdateProperties({ databaseProperties: newProps });
  };

  const toggleDropdown = (key, buttonRef) => {
    const isOpening = !openDropdowns[key];
    
    if (isOpening && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 240;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      // Calculer la position exacte pour fixed positioning
      setDropdownStyles(prev => ({
        ...prev,
        [key]: {
          position: 'fixed',
          left: `${rect.left}px`,
          top: openUpward ? 'auto' : `${rect.bottom + 4}px`,
          bottom: openUpward ? `${window.innerHeight - rect.top + 4}px` : 'auto',
          width: `${rect.width}px`,
          zIndex: 9999
        }
      }));
      
      setDropdownPositions(prev => ({
        ...prev,
        [key]: { openUpward }
      }));
    }
    
    setOpenDropdowns(prev => ({ ...prev, [key]: !prev[key] }));
    if (!isOpening) {
      setSearchInputs(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleSearchInput = (key, value) => {
    setSearchInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateChip = (key, value) => {
    if (!value.trim()) return;
    
    const currentValue = properties[key] || [];
    if (!currentValue.includes(value.trim())) {
      handlePropertyChange(key, [...currentValue, value.trim()]);
    }
    setSearchInputs(prev => ({ ...prev, [key]: '' }));
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
              placeholder={`Saisir ${(schemaProp?.name || key).toLowerCase()}...`}
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
      case 'status': {
        const isOpen = openDropdowns[key];
        const options = schemaProp?.options || [];
        const selectedOption = options.find(o => o.name === value);
        const colors = selectedOption?.color ? NOTION_COLORS[selectedOption.color] : NOTION_COLORS.default;
        const position = dropdownPositions[key] || {};
        
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Tag size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            
            <div className="relative">
              <button
                ref={el => dropdownRefs.current[key] = el}
                onClick={() => toggleDropdown(key, dropdownRefs.current[key])}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-left flex items-center justify-between hover:bg-gray-50 transition-all focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                {value ? (
                  <span 
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium max-w-[calc(100%-30px)] truncate"
                    style={{ 
                      backgroundColor: colors.bg,
                      color: colors.text
                    }}
                  >
                    {value}
                  </span>
                ) : (
                  <span className="text-gray-400">Sélectionner...</span>
                )}
                <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
  
              <AnimatePresence>
                {isOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[9998]" 
                      onClick={() => toggleDropdown(key)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={dropdownStyles[key] || {}}
                      className="bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto notion-scrollbar-vertical"
                    >
                      {value && (
                        <button
                          onClick={() => {
                            handlePropertyChange(key, null);
                            toggleDropdown(key);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100 flex items-center gap-2 sticky top-0 bg-white z-10"
                        >
                          <X size={12} />
                          Aucune sélection
                        </button>
                      )}
                      
                      {options.length > 0 ? options.map((option) => {
                        const optionColors = option.color ? NOTION_COLORS[option.color] : NOTION_COLORS.default;
                        return (
                          <button
                            key={option.id || option.name}
                            onClick={() => {
                              handlePropertyChange(key, option.name);
                              toggleDropdown(key);
                            }}
                            className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                              value === option.name ? 'bg-gray-50' : ''
                            }`}
                          >
                            <span 
                              className="px-2.5 py-1 rounded-md text-xs font-medium flex-1 truncate"
                              style={{ 
                                backgroundColor: optionColors.bg,
                                color: optionColors.text
                              }}
                            >
                              {option.name}
                            </span>
                            {value === option.name && (
                              <Check size={14} className="text-gray-900 flex-shrink-0" />
                            )}
                          </button>
                        );
                      }) : (
                        <div className="px-3 py-6 text-center text-xs text-gray-500">
                          Aucune option disponible
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      }
  
      case 'multi_select': {
        const isMultiOpen = openDropdowns[key];
        const multiOptions = schemaProp?.options || [];
        const searchTerm = searchInputs[key] || '';
        const position = dropdownPositions[key] || {};
        
        // Filtrer les options en fonction de la recherche
        const filteredOptions = multiOptions.filter(option =>
          option.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
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
            
            {value.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 rounded-lg max-h-32 overflow-y-auto notion-scrollbar-vertical">
                {value.map((item, index) => {
                  const option = multiOptions.find(o => o.name === item);
                  const chipColors = option?.color ? NOTION_COLORS[option.color] : NOTION_COLORS.default;
                  return (
                    <motion.span
                      key={index}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium max-w-[140px]"
                      style={{ 
                        backgroundColor: chipColors.bg,
                        color: chipColors.text
                      }}
                    >
                      <span className="truncate">{item}</span>
                      <button
                        onClick={() => {
                          const newValue = value.filter((_, i) => i !== index);
                          handlePropertyChange(key, newValue);
                        }}
                        className="hover:opacity-70 flex-shrink-0"
                      >
                        <X size={10} />
                      </button>
                    </motion.span>
                  );
                })}
              </div>
            )}
  
            <div className="relative">
              <button
                ref={el => dropdownRefs.current[key] = el}
                onClick={() => toggleDropdown(key, dropdownRefs.current[key])}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-left flex items-center justify-between hover:bg-gray-50 transition-all focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <span className="text-gray-400">
                  {value.length > 0 ? 'Ajouter...' : 'Sélectionner...'}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isMultiOpen ? 'rotate-180' : ''}`} />
              </button>
  
              <AnimatePresence>
                {isMultiOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[9998]" 
                      onClick={() => toggleDropdown(key)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={dropdownStyles[key] || {}}
                      className="bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-hidden notion-scrollbar-vertical"
                    >
                      {/* Input de recherche / création */}
                      <div className="sticky top-0 bg-white border-b border-gray-100 p-2 z-10">
                        <div className="relative">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => handleSearchInput(key, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && searchTerm.trim()) {
                                e.preventDefault();
                                handleCreateChip(key, searchTerm);
                              }
                            }}
                            placeholder="Rechercher ou créer..."
                            className="w-full px-3 py-2 pr-8 bg-gray-50 border-0 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
                            autoFocus
                          />
                          {searchTerm && (
                            <button
                              onClick={() => handleCreateChip(key, searchTerm)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors"
                              title="Créer un nouveau tag"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                        {searchTerm && !filteredOptions.some(o => o.name === searchTerm) && (
                          <div className="mt-1.5 text-[10px] text-gray-500 flex items-center gap-1">
                            <Plus size={10} />
                            Appuyez sur Entrée pour créer &quot;{searchTerm}&quot;
                          </div>
                        )}
                      </div>

                      {/* Liste des options */}
                      <div className="overflow-y-auto max-h-48 notion-scrollbar-vertical">
                        {filteredOptions.length > 0 ? filteredOptions.map((option) => {
                          const isSelected = value.includes(option.name);
                          const optionColors = option.color ? NOTION_COLORS[option.color] : NOTION_COLORS.default;
                          return (
                            <button
                              key={option.id || option.name}
                              onClick={() => {
                                const newValue = isSelected
                                  ? value.filter(v => v !== option.name)
                                  : [...value, option.name];
                                handlePropertyChange(key, newValue);
                              }}
                              className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                                isSelected ? 'bg-gray-50' : ''
                              }`}
                            >
                              <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all flex-shrink-0 ${
                                isSelected 
                                  ? 'bg-gray-900 border-gray-900' 
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && <Check size={10} className="text-white" />}
                              </div>
                              <span 
                                className="px-2.5 py-1 rounded-md text-xs font-medium flex-1 truncate"
                                style={{ 
                                  backgroundColor: optionColors.bg,
                                  color: optionColors.text
                                }}
                              >
                                {option.name}
                              </span>
                            </button>
                          );
                        }) : (
                          <div className="px-3 py-6 text-center text-xs text-gray-500">
                            {searchTerm ? 'Aucun résultat' : 'Aucune option disponible'}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      }
  
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
                  Aujourd&apos;hui
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
                className="w-full px-3 py-2 pr-8 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
                placeholder="https://..."
              />
              {value && (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <Globe size={14} />
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
              placeholder={`Saisir ${(schemaProp?.name || key).toLowerCase()}...`}
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
    // eslint-disable-next-line no-console
    console.error('❌ databaseSchema prop est manquante');
    return (
      <div className="text-center py-8">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-3">
          <AlertCircle size={16} className="text-amber-600" />
        </div>
        <p className="text-xs text-amber-600 font-medium">Schéma en cours de chargement</p>
        <p className="text-xs text-gray-500 mt-1">
          Veuillez patienter...
        </p>
      </div>
    );
  }

  // eslint-disable-next-line no-console
  console.log('✅ Rendu avec schéma:', Object.keys(databaseSchema.properties || {}).length, 'propriétés');

  const allProperties = Object.entries(selectedPage.properties || {})
    .filter(([key]) => key !== 'title' && key !== 'Nom')
    .sort((a, b) => {
      const aSchema = databaseSchema.properties?.[a[0]];
      const bSchema = databaseSchema.properties?.[b[0]];
      if (aSchema?.id && bSchema?.id) {
        return aSchema.id.localeCompare(bSchema.id);
      }
      return a[0].localeCompare(b[0]);
    });

  // eslint-disable-next-line no-console
  console.log('📋 Propriétés à afficher:', allProperties.map(([key]) => key));

  return (
    <>
      <style>{`
        .notion-scrollbar-vertical {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db #f9fafb;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar {
          width: 8px;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-track {
          background: #f9fafb;
          border-radius: 4px;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
          border-radius: 4px;
          border: 2px solid #f9fafb;
          transition: background-color 0.2s;
        }
        
        .notion-scrollbar-vertical:hover::-webkit-scrollbar-thumb {
          background-color: #9ca3af;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-thumb:hover {
          background-color: #6b7280;
        }
      `}</style>
      
      <div className="space-y-3">
        {allProperties.map(([key, pageProp]) => {
          const schemaProp = databaseSchema.properties?.[key];
          
          // eslint-disable-next-line no-console
          console.log(`🔧 Rendu ${key}:`, {
            type: pageProp.type,
            hasSchema: !!schemaProp,
            hasOptions: !!schemaProp?.options,
            optionsCount: schemaProp?.options?.length || 0
          });
          
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
    </>
  );
}

DynamicDatabaseProperties.propTypes = {
  selectedPage: PropTypes.shape({
    id: PropTypes.string,
    properties: PropTypes.object
  }),
  databaseSchema: PropTypes.shape({
    properties: PropTypes.object
  }),
  multiSelectMode: PropTypes.bool,
  onUpdateProperties: PropTypes.func.isRequired
};

DynamicDatabaseProperties.defaultProps = {
  selectedPage: null,
  databaseSchema: null,
  multiSelectMode: false
};