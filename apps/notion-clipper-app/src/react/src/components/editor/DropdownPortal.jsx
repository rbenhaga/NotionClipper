import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

/**
 * Portal pour les dropdowns qui permet de les rendre en dehors du conteneur parent
 * Gère automatiquement le positionnement par rapport au bouton de référence
 */
export function DropdownPortal({ 
  isOpen, 
  onClose, 
  buttonRef, 
  children,
  className = ''
}) {
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  // Calculer la position du dropdown
  useEffect(() => {
    if (!isOpen || !buttonRef?.current) return;

    const updatePosition = () => {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const dropdownHeight = 300; // Hauteur estimée
      
      const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      setPosition({
        top: shouldOpenUpward 
          ? buttonRect.top - dropdownHeight 
          : buttonRect.bottom + 4,
        left: buttonRect.left,
        width: buttonRect.width,
        openUpward: shouldOpenUpward
      });
    };

    updatePosition();

    // Mettre à jour la position au scroll et au resize
    const handleUpdate = () => {
      if (isOpen) updatePosition();
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, buttonRef]);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target) &&
        buttonRef?.current &&
        !buttonRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    // Petit délai pour éviter que le clic d'ouverture ne ferme immédiatement
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className={className}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        zIndex: 9999,
        maxHeight: '300px'
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
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};