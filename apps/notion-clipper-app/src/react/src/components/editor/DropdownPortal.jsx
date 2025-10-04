import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

export function DropdownPortal({ isOpen, onClose, buttonRef, children }) {
    const dropdownRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const [openUpward, setOpenUpward] = useState(false);

    // Calculer et mettre à jour la position (initial + pendant scroll)
    useEffect(() => {
        if (!isOpen || !buttonRef?.current) return;

        const updatePosition = () => {
            if (!buttonRef?.current) return;

            const buttonRect = buttonRef.current.getBoundingClientRect();
            const dropdownHeight = dropdownRef.current?.offsetHeight || 300;
            
            const spaceBelow = window.innerHeight - buttonRect.bottom - 8;
            const spaceAbove = buttonRect.top - 8;
            
            // Décider si on ouvre vers le haut ou le bas
            const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
            
            setOpenUpward(shouldOpenUpward);
            setPosition({
                top: shouldOpenUpward 
                    ? buttonRect.top - dropdownHeight - 4  // Au-dessus
                    : buttonRect.bottom + 4,                // En-dessous
                left: buttonRect.left,
                width: buttonRect.width
            });
        };

        // Mise à jour initiale
        updatePosition();

        // Mettre à jour pendant le scroll pour suivre le bouton
        let rafId;
        const handleScroll = () => {
            rafId = requestAnimationFrame(updatePosition);
        };

        // Trouver le conteneur scrollable
        const scrollContainer = document.querySelector('.flex-1.overflow-y-auto');
        
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        }
        window.addEventListener('resize', updatePosition);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleScroll);
            }
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, buttonRef]);

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

        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, buttonRef]);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

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
                transformOrigin: openUpward ? 'bottom' : 'top'
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