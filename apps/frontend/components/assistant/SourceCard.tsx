'use client';

import type { RagSource } from '../../lib/api/assistant';

interface SourceCardProps {
  source: RagSource;
  index: number;
}

/**
 * SourceCard - Displays a single source reference from a RAG response
 *
 * Shows document title, number, relevance score, and a snippet of the content.
 */
export function SourceCard({ source, index }: SourceCardProps) {
  const scorePercentage = Math.round(source.score * 100);

  // Color coding for score
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30';
    return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30';
  };

  // Truncate snippet if too long
  const truncateSnippet = (text: string, maxLength = 200): string => {
    if (text.length <= maxLength) return text;
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-blue-300 dark:hover:border-blue-600 transition-colors bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Document icon */}
          <span className="flex-shrink-0 text-blue-600 dark:text-blue-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </span>

          {/* Title and document number */}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {source.title}
            </h4>
            {source.documentNumber && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {source.documentNumber}
              </span>
            )}
          </div>
        </div>

        {/* Score badge */}
        <span
          className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${getScoreColor(source.score)}`}
        >
          {scorePercentage}%
        </span>
      </div>

      {/* Snippet */}
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <span className="text-gray-400 dark:text-gray-500">&ldquo;</span>
        {truncateSnippet(source.snippet)}
        <span className="text-gray-400 dark:text-gray-500">&rdquo;</span>
      </p>

      {/* Footer - chunk info */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>Fuente #{index + 1}</span>
        <span>•</span>
        <span>Fragmento {source.chunkIndex + 1}</span>
      </div>
    </div>
  );
}

export default SourceCard;
