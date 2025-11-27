'use client';

import type { RagSource } from '../../lib/api/assistant';
import { SourceCard } from './SourceCard';

interface SourceListProps {
  sources: RagSource[];
}

/**
 * SourceList - Displays a list of source references from a RAG response
 *
 * Sources are sorted by score (highest first) and displayed in a grid layout.
 */
export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return null;
  }

  // Sort by score descending
  const sortedSources = [...sources].sort((a, b) => b.score - a.score);

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-4 h-4 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Fuentes consultadas ({sources.length})
        </h3>
      </div>

      {/* Sources grid */}
      <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
        {sortedSources.map((source, index) => (
          <SourceCard
            key={`${source.documentId}-${source.chunkIndex}`}
            source={source}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

export default SourceList;
