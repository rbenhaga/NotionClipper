// src/react/src/components/common/StepIcon.jsx
import React from 'react';
import { Sparkles, Key, Image as ImageIcon, CheckCircle } from 'lucide-react';

export default function StepIcon({ name, ...props }) {
  switch (name) {
    case 'Sparkles': return <Sparkles {...props} />;
    case 'Key': return <Key {...props} />;
    case 'Image': return <ImageIcon {...props} />;
    case 'CheckCircle': return <CheckCircle {...props} />;
    default: return null;
  }
}