import React from 'react';

export default function ContentArea({ children }) {
  return (
    <div className="flex-1 flex flex-col bg-notion-gray-50">
      {children}
    </div>
  );
}