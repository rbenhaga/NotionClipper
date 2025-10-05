import React, { useRef, useEffect, useState, useCallback, RefObject } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef: RefObject<HTMLElement>;
  children: React.ReactNode;
}

export function DropdownPortal({ isOpen, onClose, buttonRef, children }: DropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [initialFlipDirection, setInitialFlipDirection] = useState<'up' | 'down'>('down');
  const rafRef = useRef<number | null>(null);

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
        calculatePosition(true);
      });
    } else {
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

    const findScrollParent = (element: HTMLElement | null): HTMLElement | Window => {
      if (!element) return window;
      
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
    
    scrollElement.addEventListener('scroll', updatePosition, { passive: true } as AddEventListenerOptions);
    window.addEventListener('resize', updatePosition, { passive: true } as AddEventListenerOptions);

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

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (buttonRef?.current?.contains(e.target as Node)) {
        return;
      }

      if (dropdownRef.current?.contains(e.target as Node)) {
        return;
      }

      onClose();
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('touchstart', handleClickOutside, true);
    }, 0);

    const handleEscape = (e: KeyboardEvent) => {
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