'use client';

import Link from 'next/link';
import type { RagSource } from '../../lib/api/assistant';

interface SourceCardProps {
  source: RagSource;
}

export function SourceCard({ source }: SourceCardProps) {
  const documentHref = `/documentos/${source.documentId}`;

  return (
    <li className="truncate">
      <Link
        href={documentHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline active:opacity-70"
      >
        {source.title}
      </Link>
    </li>
  );
}

export default SourceCard;
