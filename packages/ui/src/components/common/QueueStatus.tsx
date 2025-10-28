// packages/ui/src/components/common/QueueStatus.tsx
import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface QueueStatusProps {
  queued?: number;
  processing?: number;
  failed?: number;
  className?: string;
}

export function QueueStatus({ 
  queued = 0, 
  processing = 0, 
  failed = 0, 
  className = '' 
}: QueueStatusProps) {
  const total = queued + processing + failed;
  
  if (total === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {queued > 0 && (
        <div className="flex items-center gap-1 text-amber-600">
          <Clock size={14} />
          <span>{queued}</span>
        </div>
      )}
      
      {processing > 0 && (
        <div className="flex items-center gap-1 text-blue-600">
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{processing}</span>
        </div>
      )}
      
      {failed > 0 && (
        <div className="flex items-center gap-1 text-red-600">
          <AlertCircle size={14} />
          <span>{failed}</span>
        </div>
      )}
    </div>
  );
}