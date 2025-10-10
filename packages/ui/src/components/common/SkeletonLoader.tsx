import React from 'react';

export function SkeletonPageCard() {
  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 bg-gray-200 rounded" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="w-4 h-4 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export function SkeletonPageList() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(5)].map((_, i) => (
        <SkeletonPageCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonClipboard() {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-3 bg-gray-100 rounded w-4/6" />
      </div>
    </div>
  );
}