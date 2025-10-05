import React, { ReactNode } from 'react';

interface ContentAreaProps {
  children: ReactNode;
}

/**
 * Zone de contenu principale
 * Contient l'éditeur et les options de formatage
 */
export function ContentArea({ children }: ContentAreaProps) {
  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {children}
    </div>
  );
}