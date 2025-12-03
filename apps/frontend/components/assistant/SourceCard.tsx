'use client';

import Link from 'next/link';
import type { RagSource } from '../../lib/api/assistant';

interface SourceCardProps {
  source: RagSource;
}

/**
 * SourceCard - Displays a single source reference from a RAG response
 *
 * Shows only the document title as a clickable link.
 */
export function SourceCard({ source }: SourceCardProps) {
  const documentHref = `/documentos/${source.documentId}`;

  return (
    <li>
      <Link
        href={documentHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
      >
        {source.title}
      </Link>
    </li>
  );
}

export default SourceCard;
