'use client';

import type { RagSource } from '../../lib/api/assistant';
import { SourceCard } from './SourceCard';

interface SourceListProps {
  sources: RagSource[];
}

export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return null;
  }

  const uniqueSources = sources.reduce((acc, source) => {
    if (!acc.find(s => s.documentId === source.documentId)) {
      acc.push(source);
    }
    return acc;
  }, [] as RagSource[]);

  return (
    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5 sm:mb-2">
        Fuentes ({uniqueSources.length})
      </h3>
      <ul className="list-disc list-inside space-y-0.5 sm:space-y-1">
        {uniqueSources.map((source) => (
          <SourceCard key={source.documentId} source={source} />
        ))}
      </ul>
    </div>
  );
}

export default SourceList;
