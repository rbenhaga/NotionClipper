// src/react/src/components/common/TabIcon.jsx
import React from 'react';
import { TrendingUp, Star, Clock, Folder } from 'lucide-react';

export default function TabIcon({ name, ...props }) {
  switch (name) {
    case 'TrendingUp':
      return <TrendingUp {...props} />;
    case 'Star':
      return <Star {...props} />;
    case 'Clock':
      return <Clock {...props} />;
    case 'Folder':
      return <Folder {...props} />;
    default:
      return null;
  }
}