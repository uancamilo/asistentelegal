'use client';

import type { RagSource } from '../../lib/api/assistant';
import { SourceCard } from './SourceCard';

interface SourceListProps {
  sources: RagSource[];
}

/**
 * SourceList - Displays a list of source references from a RAG response
 *
 * Shows unique documents as a simple list of clickable links.
 */
export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return null;
  }

  // Deduplicate by documentId, keeping only unique documents
  const uniqueSources = sources.reduce((acc, source) => {
    if (!acc.find(s => s.documentId === source.documentId)) {
      acc.push(source);
    }
    return acc;
  }, [] as RagSource[]);

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      {/* Header */}
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
        Fuentes consultadas ({uniqueSources.length})
      </h3>

      {/* Sources list */}
      <ul className="list-disc list-inside space-y-1">
        {uniqueSources.map((source) => (
          <SourceCard
            key={source.documentId}
            source={source}
          />
        ))}
      </ul>
    </div>
  );
}

export default SourceList;
