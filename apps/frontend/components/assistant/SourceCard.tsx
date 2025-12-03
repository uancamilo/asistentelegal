'use client';

import Link from 'next/link';
import type { RagSource } from '../../lib/api/assistant';

interface SourceCardProps {
  source: RagSource;
  index: number;
}

/**
 * SourceCard - Displays a single source reference from a RAG response
 *
 * Shows document title (clickable), number, and a snippet of the content.
 */
export function SourceCard({ source, index }: SourceCardProps) {
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
      <div className="flex items-start gap-2 mb-2">
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

          {/* Title (clickable) and document number */}
          <div className="min-w-0 flex-1">
            <Link
              href={`/documentos/${source.documentId}`}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline truncate block"
            >
              {source.title}
            </Link>
            {source.documentNumber && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {source.documentNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Snippet */}
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <span className="text-gray-400 dark:text-gray-500">&ldquo;</span>
        {truncateSnippet(source.snippet)}
        <span className="text-gray-400 dark:text-gray-500">&rdquo;</span>
      </p>
    </div>
  );
}

export default SourceCard;
