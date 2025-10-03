// src/react/src/components/common/Tooltip.jsx
import React, { useState } from 'react';

export default function Tooltip({ children, content, delay = 300 }) {
  const [show, setShow] = useState(false);
  const [timeout, setTimeoutId] = useState(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => setShow(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeout) clearTimeout(timeout);
    setShow(false);
  };

  if (!content) return children;

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {show && (
        <div className="absolute z-50 px-2 py-1 text-xs text-white bg-notion-gray-900 rounded-md whitespace-nowrap -top-8 left-1/2 transform -translate-x-1/2 pointer-events-none">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-notion-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}