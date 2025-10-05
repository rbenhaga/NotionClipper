import React, { useRef, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';

/**
 * DropdownPortal FINAL - Fonctionne avec la structure Layout corrigée
 * 
 * Problèmes résolus:
 * 1. Layout a maintenant overflow-hidden sur le conteneur principal
 * 2. Un wrapper flex-row contient Sidebar + ContentArea
 * 3. ContentArea a overflow-hidden
 * 4. Le scroll est dans ContentEditor uniquement
 * 5. Le dropdown suit correctement le scroll
 */
export function DropdownPortal({ isOpen, onClose, buttonRef, children }) {
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const rafRef = useRef(null);

  // Calcul de position optimisé
  const calculatePosition = useCallback(() => {
    if (!buttonRef?.current || !isOpen) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = dropdownRef.current?.offsetHeight || 300;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Espace disponible en bas et en haut
    const spaceBelow = viewportHeight - buttonRect.bottom - 8;
    const spaceAbove = buttonRect.top - 8;
    
    // Décision: ouvrir en bas par défaut, flip en haut si nécessaire
    const shouldFlipUp = spaceBelow < Math.min(dropdownHeight + 20, 200) && spaceAbove > spaceBelow;
    
    // Position verticale
    let top;
    if (shouldFlipUp) {
      // Ouvrir vers le haut
      const actualHeight = dropdownRef.current?.offsetHeight || dropdownHeight;
      top = buttonRect.top - actualHeight - 4;
    } else {
      // Ouvrir vers le bas (défaut)
      top = buttonRect.bottom + 4;
    }

    // Position horizontale avec gestion des bords
    let left = buttonRect.left;
    const dropdownWidth = buttonRect.width;
    
    // Empêcher le débordement à droite
    if (left + dropdownWidth > viewportWidth - 8) {
      left = viewportWidth - dropdownWidth - 8;
    }
    
    // Empêcher le débordement à gauche
    if (left < 8) {
      left = 8;
    }

    setPosition({
      top: Math.max(8, top),
      left,
      width: buttonRect.width
    });
  }, [buttonRef, isOpen]);

  // Position initiale
  useEffect(() => {
    if (isOpen) {
      // Petit délai pour que le dropdown soit monté et ait une hauteur
      requestAnimationFrame(() => {
        calculatePosition();
      });
    }
  }, [isOpen, calculatePosition]);

  // Gestion du scroll et resize avec requestAnimationFrame pour performance
  useEffect(() => {
    if (!isOpen) return;

    let ticking = false;

    const updatePosition = () => {
      if (!ticking) {
        rafRef.current = requestAnimationFrame(() => {
          calculatePosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Fonction pour trouver le conteneur scrollable parent
    const findScrollParent = (element) => {
      if (!element) return document;
      
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const overflow = style.overflow + style.overflowY + style.overflowX;
        
        if (/(auto|scroll)/.test(overflow)) {
          // Vérifie si ça scroll réellement
          if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
            console.log('📍 Scroll parent trouvé:', parent.className);
            return parent;
          }
        }
        parent = parent.parentElement;
      }
      
      console.log('📍 Pas de scroll parent trouvé, utilise window');
      return window;
    };

    const scrollParent = buttonRef?.current ? findScrollParent(buttonRef.current) : window;

    // Event listeners
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

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      // Ignore si click sur le bouton
      if (buttonRef?.current?.contains(e.target)) {
        return;
      }

      // Ignore si click dans le dropdown
      if (dropdownRef.current?.contains(e.target)) {
        return;
      }

      // Ferme le dropdown
      onClose();
    };

    // Délai pour éviter fermeture immédiate au click d'ouverture
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('touchstart', handleClickOutside, true);
    }, 0);

    // ESC pour fermer
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
        zIndex: 9999,
        // Optimisations de performance
        willChange: 'transform',
        transform: 'translateZ(0)', // Force GPU acceleration
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