// DropdownPortal.jsx
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

export function DropdownPortal({ isOpen, onClose, buttonRef, children }) {
    const dropdownRef = useRef(null);
    const [style, setStyle] = useState({});

    useEffect(() => {
        if (!isOpen || !buttonRef?.current) return;

        const updatePosition = () => {
            if (!buttonRef?.current) return;
            
            const button = buttonRef.current;
            const buttonRect = button.getBoundingClientRect();
            
            // Créer un élément temporaire pour mesurer la hauteur du dropdown
            const temp = document.createElement('div');
            temp.style.position = 'absolute';
            temp.style.visibility = 'hidden';
            temp.innerHTML = dropdownRef.current ? dropdownRef.current.innerHTML : '';
            document.body.appendChild(temp);
            const dropdownHeight = temp.offsetHeight || 300;
            document.body.removeChild(temp);
            
            // Calculer la position
            const scrollContainer = document.querySelector('.flex-1.overflow-y-auto');
            if (!scrollContainer) return;
            
            const containerRect = scrollContainer.getBoundingClientRect();
            
            // Position relative au conteneur
            const relativeTop = buttonRect.bottom - containerRect.top + scrollContainer.scrollTop;
            const relativeLeft = buttonRect.left - containerRect.left;
            
            setStyle({
                position: 'absolute',
                top: `${relativeTop + 4}px`,
                left: `${relativeLeft}px`,
                width: `${buttonRect.width}px`,
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 9999
            });
        };

        updatePosition();
        
        // Écouter le scroll du conteneur
        const scrollContainer = document.querySelector('.flex-1.overflow-y-auto');
        if (scrollContainer) {
            const handleScroll = () => updatePosition();
            scrollContainer.addEventListener('scroll', handleScroll);
            window.addEventListener('resize', updatePosition);
            
            return () => {
                scrollContainer.removeEventListener('scroll', handleScroll);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen, buttonRef]);

    // Clic extérieur
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (dropdownRef.current && 
                !dropdownRef.current.contains(e.target) &&
                buttonRef?.current && 
                !buttonRef.current.contains(e.target)) {
                onClose();
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, buttonRef]);

    if (!isOpen) return null;

    // INJECTER DANS LE CONTENEUR SCROLLABLE
    const scrollContainer = document.querySelector('.flex-1.overflow-y-auto');
    if (!scrollContainer) return null;

    // Créer un div wrapper s'il n'existe pas
    let portalRoot = scrollContainer.querySelector('#dropdown-portal-root');
    if (!portalRoot) {
        portalRoot = document.createElement('div');
        portalRoot.id = 'dropdown-portal-root';
        portalRoot.style.position = 'relative';
        scrollContainer.appendChild(portalRoot);
    }

    return (
        <div 
            ref={dropdownRef}
            style={style}
        >
            {children}
        </div>
    );
}

DropdownPortal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    buttonRef: PropTypes.object.isRequired,
    children: PropTypes.node.isRequired
};