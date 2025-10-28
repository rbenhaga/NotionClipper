import { useState, useEffect } from 'react';

interface PagesProgress {
  count: number;
  batch?: number;
  total?: number;
  completed: boolean;
}

export function usePagesProgress() {
  const [progress, setProgress] = useState<PagesProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!(window as any).electronAPI?.on) return;

    const handleProgress = (event: any, data: PagesProgress) => {
      console.log('[PAGES PROGRESS]', data);
      setProgress(data);
      setIsLoading(!data.completed);
    };

    (window as any).electronAPI.on('pages:progress', handleProgress);

    return () => {
      if ((window as any).electronAPI?.removeListener) {
        (window as any).electronAPI.removeListener('pages:progress', handleProgress);
      }
    };
  }, []);

  return {
    progress,
    isLoading,
    count: progress?.count || 0,
    total: progress?.total || 0,
    completed: progress?.completed || false
  };
}