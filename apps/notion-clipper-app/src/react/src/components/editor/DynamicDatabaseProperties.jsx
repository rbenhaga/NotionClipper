import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Type, Hash, Calendar, Link, Mail, Phone,
  Tag, FileText, ChevronDown, X, Check, Globe, AlertCircle, Plus
} from 'lucide-react';

const NOTION_COLORS = {
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

function DropdownPortal({ isOpen, onClose, buttonRef, children }) {
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [initialFlipDirection, setInitialFlipDirection] = useState('down'); // 'up' ou 'down'
  const rafRef = useRef(null);

  const calculatePosition = useCallback((isInitial = false) => {
    if (!buttonRef?.current || !isOpen) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    // Position verticale: TOUJOURS en bas, jamais de flip
    const top = buttonRect.bottom + 4;
    
    if (isInitial) {
      // On mémorise toujours 'down' car on ne flip jamais
      setInitialFlipDirection('down');
    }

    // Position horizontale avec gestion des bords
    let left = buttonRect.left;
    const dropdownWidth = buttonRect.width;
    
    if (left + dropdownWidth > viewportWidth - 8) {
      left = viewportWidth - dropdownWidth - 8;
    }
    
    if (left < 8) {
      left = 8;
    }

    setPosition({
      top,
      left,
      width: buttonRect.width
    });
  }, [buttonRef, isOpen]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        calculatePosition(true); // Premier calcul: on calcule le flip
      });
    } else {
      // Reset la direction quand le dropdown se ferme
      setInitialFlipDirection('down');
    }
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      rafRef.current = requestAnimationFrame(() => {
        calculatePosition(false);
      });
    };

    const findScrollParent = (element) => {
      if (!element) return document;
      
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const overflow = style.overflow + style.overflowY + style.overflowX;
        
        if (/(auto|scroll)/.test(overflow)) {
          if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
            return parent;
          }
        }
        parent = parent.parentElement;
      }
      
      return window;
    };

    const scrollParent = buttonRef?.current ? findScrollParent(buttonRef.current) : window;
    const scrollElement = scrollParent === window ? window : scrollParent;
    
    scrollElement.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });

    return () => {
      scrollElement.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
      
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isOpen, calculatePosition, buttonRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (buttonRef?.current?.contains(e.target)) {
        return;
      }

      if (dropdownRef.current?.contains(e.target)) {
        return;
      }

      onClose();
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('touchstart', handleClickOutside, true);
    }, 0);

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        zIndex: 50,
        willChange: 'transform',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      {children}
    </div>,
    document.body
  );
}

DropdownPortal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  buttonRef: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired
};

export default function DynamicDatabaseProperties({
  selectedPage,
  databaseSchema,
  multiSelectMode,
  onUpdateProperties
}) {
  const [properties, setProperties] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [searchInputs, setSearchInputs] = useState({});
  const buttonRefs = useRef({});

  const extractPropertyValue = React.useCallback((prop) => {
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
          return prop.multi_select.map(item => item.name);
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
      const initialProps = {};
      const unsupportedTypes = [
        'last_edited_time', 'created_time', 'last_edited_by',
        'created_by', 'relation', 'rollup', 'formula', 'files', 'people'
      ];

      Object.entries(selectedPage.properties).forEach(([key, prop]) => {
        if (prop.type && key !== 'title' && !unsupportedTypes.includes(prop.type)) {
          const extracted = extractPropertyValue(prop);
          initialProps[key] = extracted;
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

  const toggleDropdown = (key) => {
    setOpenDropdowns(prev => {
      const newState = {};
      Object.keys(prev).forEach(k => {
        newState[k] = false;
      });
      newState[key] = !prev[key];
      return newState;
    });

    if (openDropdowns[key]) {
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

  const handleRemoveChip = (key, chipToRemove) => {
    const currentValue = properties[key] || [];
    handlePropertyChange(key, currentValue.filter(chip => chip !== chipToRemove));
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
        const selectOptions = schemaProp?.select?.options || [];
        return (
          <div className="space-y-2">
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
                        backgroundColor: NOTION_COLORS[selectOptions.find(opt => opt.name === value)?.color || 'default'].bg,
                        color: NOTION_COLORS[selectOptions.find(opt => opt.name === value)?.color || 'default'].text
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
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="max-h-60 overflow-y-auto py-1 notion-scrollbar-vertical">
                    {selectOptions.length > 0 ? (
                      selectOptions.map((option) => (
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
                </motion.div>
              </DropdownPortal>
            </div>
          </div>
        );

      case 'multi_select':
        const multiSelectOptions = schemaProp?.multi_select?.options || [];
        const multiSelectValue = Array.isArray(value) ? value : [];
        const searchValue = searchInputs[key] || '';

        const filteredOptions = multiSelectOptions.filter(option =>
          !multiSelectValue.includes(option.name) &&
          option.name.toLowerCase().includes(searchValue.toLowerCase())
        );

        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Tag size={12} className="text-gray-400" />
              {schemaProp?.name || key}
            </label>

            {multiSelectValue.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {multiSelectValue.map((chip) => {
                  const chipOption = multiSelectOptions.find(opt => opt.name === chip);
                  const chipColor = chipOption?.color || 'default';

                  return (
                    <motion.button
                      key={chip}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleRemoveChip(key, chip)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
                      style={{
                        backgroundColor: NOTION_COLORS[chipColor].bg,
                        color: NOTION_COLORS[chipColor].text
                      }}
                    >
                      <span className="select-none">{chip}</span>
                      <X size={12} className="flex-shrink-0" />
                    </motion.button>
                  );
                })}
              </div>
            )}

            <div className="relative">
              <button
                ref={(el) => buttonRefs.current[key] = el}
                onClick={() => toggleDropdown(key)}
                className="flex items-center justify-between w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-all group"
              >
                <span className="text-gray-400">
                  {multiSelectValue.length > 0
                    ? `${multiSelectValue.length} sélectionné(s)`
                    : `Ajouter ${(schemaProp?.name || key).toLowerCase()}...`}
                </span>
                <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600" />
              </button>

              <DropdownPortal
                isOpen={!!openDropdowns[key]}
                onClose={() => setOpenDropdowns(prev => ({ ...prev, [key]: false }))}
                buttonRef={{ current: buttonRefs.current[key] }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="p-2 border-b border-gray-100">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => handleSearchInput(key, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchValue.trim()) {
                          handleCreateChip(key, searchValue);
                        }
                      }}
                      placeholder="Rechercher ou créer..."
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto py-1 notion-scrollbar-vertical">
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((option) => (
                        <button
                          key={option.id || option.name}
                          onClick={() => {
                            handlePropertyChange(key, [...multiSelectValue, option.name]);
                            setSearchInputs(prev => ({ ...prev, [key]: '' }));
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
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
                      ))
                    ) : searchValue.trim() ? (
                      <button
                        onClick={() => handleCreateChip(key, searchValue)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                      >
                        <Plus size={14} className="text-gray-400" />
                        <span className="text-gray-600">Créer "{searchValue}"</span>
                      </button>
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-400">
                        Toutes les options sont sélectionnées
                      </div>
                    )}
                  </div>
                </motion.div>
              </DropdownPortal>
            </div>
          </div>
        );

      case 'status':
        const statusOptions = schemaProp?.status?.options || [];
        return (
          <div className="space-y-2">
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
                        backgroundColor: NOTION_COLORS[statusOptions.find(opt => opt.name === value)?.color || 'default'].bg,
                        color: NOTION_COLORS[statusOptions.find(opt => opt.name === value)?.color || 'default'].text
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
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="max-h-60 overflow-y-auto py-1 notion-scrollbar-vertical">
                    {statusOptions.length > 0 ? (
                      statusOptions.map((option) => (
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
                </motion.div>
              </DropdownPortal>
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
        <p className="text-xs text-gray-500 mt-1">
          Veuillez patienter...
        </p>
      </div>
    );
  }

  const unsupportedTypes = [
    'last_edited_time', 'created_time', 'last_edited_by',
    'created_by', 'relation', 'rollup', 'formula', 'files', 'people'
  ];

  const allProperties = Object.entries(selectedPage.properties || {})
    .filter(([key, prop]) => {
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
          return (
            <div key={key}>
              {renderProperty(key, pageProp, schemaProp)}
            </div>
          );
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