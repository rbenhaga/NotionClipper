import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain } from '../common/MotionWrapper';
import {
  Type, Hash, Calendar, Link, Mail, Phone,
  Tag, FileText, ChevronDown, X, Check, Globe, AlertCircle, Plus
} from 'lucide-react';
import { DropdownPortal } from './DropdownPortal';

const NOTION_COLORS: Record<string, { bg: string; text: string }> = {
  default: { bg: '#f1f1ef', text: '#37352f' },
  gray: { bg: '#e3e2e0', text: '#787774' },
  brown: { bg: '#eee0da', text: '#9f6b53' },
  orange: { bg: '#fadec9', text: '#d9730d' },
  yellow: { bg: '#fdecc8', text: '#cb912f' },
  green: { bg: '#ddedea', text: '#448361' },
  blue: { bg: '#ddebf1', text: '#337ea9' },
  purple: { bg: '#e8deee', text: '#9065b0' },
  pink: { bg: '#f5e0e9', text: '#c14c8a' },
  red: { bg: '#ffe2dd', text: '#d44c47' }
};

interface DynamicDatabasePropertiesProps {
  selectedPage: any;
  databaseSchema: any;
  multiSelectMode: boolean;
  onUpdateProperties: (properties: any) => void;
}

export function DynamicDatabaseProperties({
  selectedPage,
  databaseSchema,
  multiSelectMode,
  onUpdateProperties
}: DynamicDatabasePropertiesProps) {
  const [properties, setProperties] = useState<Record<string, any>>({});
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({});
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const extractPropertyValue = useCallback((prop: any) => {
    if (!prop || !prop.type) return '';

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
        if (Array.isArray(prop.multi_select)) {
          return prop.multi_select.map((item: any) => item.name);
        }
        return [];
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
      const initialProps: Record<string, any> = {};
      const unsupportedTypes = [
        'last_edited_time', 'created_time', 'last_edited_by',
        'created_by', 'relation', 'rollup', 'formula', 'files', 'people'
      ];

      Object.entries(selectedPage.properties).forEach(([key, prop]: [string, any]) => {
        if (prop.type && key !== 'title' && key !== 'Nom' && !unsupportedTypes.includes(prop.type)) {
          const extracted = extractPropertyValue(prop);
          initialProps[key] = extracted;
        }
      });
      setProperties(initialProps);
    }
  }, [selectedPage, extractPropertyValue]);

  const handlePropertyChange = (key: string, value: any) => {
    const newProps = { ...properties, [key]: value };
    setProperties(newProps);
    onUpdateProperties({ databaseProperties: newProps });
  };

  const toggleDropdown = (key: string) => {
    setOpenDropdowns(prev => ({ ...prev, [key]: !prev[key] }));
    if (!openDropdowns[key]) {
      setSearchInputs(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleSearchInput = (key: string, value: string) => {
    setSearchInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateChip = (key: string, chipName: string) => {
    const currentValue = properties[key] || [];
    if (!currentValue.includes(chipName)) {
      handlePropertyChange(key, [...currentValue, chipName]);
    }
    setSearchInputs(prev => ({ ...prev, [key]: '' }));
  };

  const handleRemoveChip = (key: string, chipName: string) => {
    const currentValue = properties[key] || [];
    handlePropertyChange(key, currentValue.filter((v: string) => v !== chipName));
  };

  const renderProperty = (key: string, pageProp: any, schemaProp: any) => {
    const value = properties[key] ?? extractPropertyValue(pageProp);

    switch (pageProp?.type) {
      case 'rich_text':
        return (
          <div className="space-y-2" key={key}>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Type size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
              placeholder={`Saisir ${(schemaProp?.name || key).toLowerCase()}...`}
            />
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2" key={key}>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Hash size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handlePropertyChange(key, e.target.value ? parseFloat(e.target.value) : '')}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
              placeholder="0"
            />
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2" key={key}>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
              <Tag size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <button
              onClick={() => handlePropertyChange(key, !value)}
              className="flex items-center justify-between w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-all group"
            >
              <span className={`text-sm ${value ? 'text-gray-900' : 'text-gray-500'}`}>
                {value ? 'Activé' : 'Désactivé'}
              </span>
              <MotionDiv
                initial={false}
                animate={{ backgroundColor: value ? '#18181b' : '#e5e7eb' }}
                className="relative w-10 h-5 rounded-full transition-colors"
              >
                <MotionDiv
                  initial={false}
                  animate={{ x: value ? 20 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </MotionDiv>
            </button>
          </div>
        );

      case 'select':
        const selectOptions = schemaProp?.select?.options || [];
        return (
          <div className="space-y-2" key={key}>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Tag size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <div className="relative">
              <button
                ref={(el) => buttonRefs.current[key] = el}
                onClick={() => toggleDropdown(key)}
                className="flex items-center justify-between w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-all group"
              >
                <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                  {value ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                      style={{
                        backgroundColor: NOTION_COLORS[selectOptions.find((opt: any) => opt.name === value)?.color || 'default'].bg,
                        color: NOTION_COLORS[selectOptions.find((opt: any) => opt.name === value)?.color || 'default'].text
                      }}
                    >
                      {value}
                    </span>
                  ) : `Sélectionner ${(schemaProp?.name || key).toLowerCase()}...`}
                </span>
                <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600" />
              </button>

              <DropdownPortal
                isOpen={!!openDropdowns[key]}
                onClose={() => setOpenDropdowns(prev => ({ ...prev, [key]: false }))}
                buttonRef={{ current: buttonRefs.current[key] }}
              >
                <MotionDiv
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="max-h-60 overflow-y-auto py-1 notion-scrollbar-vertical">
                    {selectOptions.length > 0 ? (
                      selectOptions.map((option: any) => (
                        <button
                          key={option.id || option.name}
                          onClick={() => {
                            handlePropertyChange(key, option.name);
                            setOpenDropdowns(prev => ({ ...prev, [key]: false }));
                          }}
                          className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors group"
                        >
                          <span
                            className="px-2.5 py-1 rounded-md text-xs font-medium"
                            style={{
                              backgroundColor: NOTION_COLORS[option.color || 'default'].bg,
                              color: NOTION_COLORS[option.color || 'default'].text
                            }}
                          >
                            {option.name}
                          </span>
                          {value === option.name && (
                            <Check size={14} className="text-gray-900 flex-shrink-0" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-400">
                        Aucune option disponible
                      </div>
                    )}
                  </div>
                </MotionDiv>
              </DropdownPortal>
            </div>
          </div>
        );

      case 'multi_select':
        const multiSelectOptions = schemaProp?.multi_select?.options || [];
        const multiSelectValue = Array.isArray(value) ? value : [];
        const searchValue = searchInputs[key] || '';
        const filteredOptions = (multiSelectOptions || []).filter((option: any) =>
          !multiSelectValue.includes(option.name) &&
          option.name.toLowerCase().includes((searchValue || '').toLowerCase())
        );

        return (
          <div className="space-y-2" key={key}>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Tag size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>

            <div className="relative">
              <button
                ref={(el) => buttonRefs.current[key] = el}
                onClick={() => toggleDropdown(key)}
                className="flex flex-wrap items-center gap-1.5 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-all group min-h-[42px]"
              >
                {(multiSelectValue || []).length > 0 ? (
                  (multiSelectValue || []).map((chipName: string) => {
                    const option = multiSelectOptions.find((opt: any) => opt.name === chipName);
                    return (
                      <span
                        key={chipName}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium"
                        style={{
                          backgroundColor: NOTION_COLORS[option?.color || 'default'].bg,
                          color: NOTION_COLORS[option?.color || 'default'].text
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveChip(key, chipName);
                        }}
                      >
                        {chipName}
                        <X size={12} className="hover:text-red-600 cursor-pointer" />
                      </span>
                    );
                  })
                ) : (
                  <span className="text-gray-400">
                    Sélectionner {(schemaProp?.name || key).toLowerCase()}...
                  </span>
                )}
                <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 ml-auto" />
              </button>

              <DropdownPortal
                isOpen={!!openDropdowns[key]}
                onClose={() => setOpenDropdowns(prev => ({ ...prev, [key]: false }))}
                buttonRef={{ current: buttonRefs.current[key] }}
              >
                <MotionDiv
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="p-2 border-b border-gray-100">
                    <input
                      type="text"
                      value={searchValue || ''}
                      onChange={(e) => handleSearchInput(key, e.target.value)}
                      placeholder="Rechercher ou créer..."
                      className="w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1 notion-scrollbar-vertical">
                    {filteredOptions.map((option: any) => (
                      <button
                        key={option.id || option.name}
                        onClick={() => {
                          handlePropertyChange(key, [...multiSelectValue, option.name]);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors group"
                      >
                        <span
                          className="px-2.5 py-1 rounded-md text-xs font-medium"
                          style={{
                            backgroundColor: NOTION_COLORS[option.color || 'default'].bg,
                            color: NOTION_COLORS[option.color || 'default'].text
                          }}
                        >
                          {option.name}
                        </span>
                      </button>
                    ))}
                    {searchValue && !(multiSelectOptions || []).find((opt: any) => opt.name.toLowerCase() === searchValue.toLowerCase()) && (
                      <button
                        onClick={() => handleCreateChip(key, searchValue)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                      >
                        <Plus size={14} className="text-gray-400" />
                        <span className="text-gray-600">Créer "{searchValue}"</span>
                      </button>
                    )}
                    {(filteredOptions || []).length === 0 && !searchValue && (
                      <div className="px-3 py-2 text-sm text-gray-400">
                        {searchValue ? 'Aucun résultat' : 'Toutes les options sont sélectionnées'}
                      </div>
                    )}
                  </div>
                </MotionDiv>
              </DropdownPortal>
            </div>
          </div>
        );

      case 'status':
        const statusOptions = schemaProp?.status?.options || [];
        return (
          <div className="space-y-2" key={key}>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Globe size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <div className="relative">
              <button
                ref={(el) => buttonRefs.current[key] = el}
                onClick={() => toggleDropdown(key)}
                className="flex items-center justify-between w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-all group"
              >
                <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                  {value ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                      style={{
                        backgroundColor: NOTION_COLORS[statusOptions.find((opt: any) => opt.name === value)?.color || 'default'].bg,
                        color: NOTION_COLORS[statusOptions.find((opt: any) => opt.name === value)?.color || 'default'].text
                      }}
                    >
                      {value}
                    </span>
                  ) : `Sélectionner ${(schemaProp?.name || key).toLowerCase()}...`}
                </span>
                <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600" />
              </button>

              <DropdownPortal
                isOpen={!!openDropdowns[key]}
                onClose={() => setOpenDropdowns(prev => ({ ...prev, [key]: false }))}
                buttonRef={{ current: buttonRefs.current[key] }}
              >
                <MotionDiv
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="max-h-60 overflow-y-auto py-1 notion-scrollbar-vertical">
                    {statusOptions.length > 0 ? (
                      statusOptions.map((option: any) => (
                        <button
                          key={option.id || option.name}
                          onClick={() => {
                            handlePropertyChange(key, option.name);
                            setOpenDropdowns(prev => ({ ...prev, [key]: false }));
                          }}
                          className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors group"
                        >
                          <span
                            className="px-2.5 py-1 rounded-md text-xs font-medium"
                            style={{
                              backgroundColor: NOTION_COLORS[option.color || 'default'].bg,
                              color: NOTION_COLORS[option.color || 'default'].text
                            }}
                          >
                            {option.name}
                          </span>
                          {value === option.name && (
                            <Check size={14} className="text-gray-900 flex-shrink-0" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-400">
                        Aucune option disponible
                      </div>
                    )}
                  </div>
                </MotionDiv>
              </DropdownPortal>
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2" key={key}>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Calendar size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="date"
              value={value || ''}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all"
            />
          </div>
        );

      case 'url':
        return (
          <div className="space-y-2" key={key}>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Link size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="url"
              value={value || ''}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
              placeholder="https://..."
            />
          </div>
        );

      case 'email':
        return (
          <div className="space-y-2" key={key}>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Mail size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="email"
              value={value || ''}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
              placeholder="email@example.com"
            />
          </div>
        );

      case 'phone_number':
        return (
          <div className="space-y-2" key={key}>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Phone size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="tel"
              value={value || ''}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
              placeholder="+33 6 12 34 56 78"
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2" key={key}>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <FileText size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>
            <input
              type="text"
              value={value || ''}
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
            ? "Propriétés de database non disponibles en multi-sélection"
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
        <p className="text-xs text-amber-600 font-medium">Schéma en cours de chargement</p>
        <p className="text-xs text-gray-500 mt-1">Veuillez patienter...</p>
      </div>
    );
  }

  const unsupportedTypes = [
    'last_edited_time', 'created_time', 'last_edited_by',
    'created_by', 'relation', 'rollup', 'formula', 'files', 'people'
  ];

  const allProperties = Object.entries(selectedPage.properties || {})
    .filter(([key, prop]: [string, any]) => {
      return key !== 'title' &&
        key !== 'Nom' &&
        !unsupportedTypes.includes(prop.type);
    })
    .sort((a, b) => {
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
        return renderProperty(key, pageProp, schemaProp);
      })}

      {allProperties.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Aucune propriété modifiable</p>
          <p className="text-xs text-gray-400 mt-1">
            Ajoutez des propriétés dans Notion
          </p>
        </div>
      )}
    </div>
  );
}