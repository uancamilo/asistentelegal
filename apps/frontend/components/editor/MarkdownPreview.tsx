'use client';

import { useRef, useEffect, useCallback, useMemo, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
  scrollRatio?: number; // 0-1 value indicating scroll position
  onScroll?: (scrollTop: number, scrollHeight: number) => void;
  className?: string;
}

/**
 * Memoized Markdown content renderer
 * Only re-renders when content actually changes
 */
const MemoizedMarkdownContent = memo(function MemoizedMarkdownContent({
  content,
}: {
  content: string;
}) {
  // Memoize the remarkPlugins array to prevent unnecessary re-renders
  const plugins = useMemo(() => [remarkGfm], []);

  if (!content) {
    return (
      <p className="text-gray-400 dark:text-gray-500 italic">
        La vista previa aparecera aqui...
      </p>
    );
  }

  return (
    <ReactMarkdown remarkPlugins={plugins}>
      {content}
    </ReactMarkdown>
  );
});

/**
 * MarkdownPreview - Live preview of Markdown content
 *
 * Features:
 * - Real-time rendering of Markdown (memoized for performance)
 * - GitHub Flavored Markdown support
 * - Scroll sync with editor
 * - Styled for legal documents
 */
export const MarkdownPreview = memo(function MarkdownPreview({
  content,
  scrollRatio,
  onScroll,
  className = '',
}: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Sync scroll from editor
  useEffect(() => {
    if (scrollRatio === undefined || !containerRef.current) return;

    isScrollingRef.current = true;
    const container = containerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    container.scrollTop = maxScroll * scrollRatio;

    // Reset flag after scroll completes
    const timeout = setTimeout(() => {
      isScrollingRef.current = false;
    }, 50);

    return () => clearTimeout(timeout);
  }, [scrollRatio]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;
    const target = e.target as HTMLDivElement;
    onScroll?.(target.scrollTop, target.scrollHeight);
  }, [onScroll]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`h-full overflow-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 ${className}`}
    >
      <div className="p-4 prose prose-sm dark:prose-invert max-w-none markdown-preview">
        <MemoizedMarkdownContent content={content} />
      </div>

      <style jsx global>{`
        .markdown-preview {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        .markdown-preview h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .markdown-preview h2 {
          font-size: 1.4rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
          color: #374151;
        }

        .dark .markdown-preview h2 {
          color: #d1d5db;
        }

        .markdown-preview h3 {
          font-size: 1.15rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }

        .dark .markdown-preview h3 {
          color: #e5e7eb;
        }

        .markdown-preview p {
          margin-bottom: 0.75rem;
          line-height: 1.7;
          text-align: justify;
        }

        .markdown-preview ul, .markdown-preview ol {
          margin-left: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .markdown-preview li {
          margin-bottom: 0.25rem;
        }

        .markdown-preview blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin-left: 0;
          margin-right: 0;
          font-style: italic;
          color: #6b7280;
          background-color: #f9fafb;
          padding: 0.5rem 1rem;
          border-radius: 0 0.25rem 0.25rem 0;
        }

        .dark .markdown-preview blockquote {
          background-color: #1f2937;
          color: #9ca3af;
        }

        .markdown-preview hr {
          margin: 1.5rem 0;
          border-color: #e5e7eb;
        }

        .dark .markdown-preview hr {
          border-color: #374151;
        }

        .markdown-preview strong {
          font-weight: 600;
        }

        .markdown-preview code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }

        .dark .markdown-preview code {
          background-color: #374151;
        }

        .markdown-preview pre {
          background-color: #1f2937;
          color: #e5e7eb;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1rem;
        }

        .markdown-preview table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
        }

        .markdown-preview th, .markdown-preview td {
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
          text-align: left;
        }

        .dark .markdown-preview th, .dark .markdown-preview td {
          border-color: #374151;
        }

        .markdown-preview th {
          background-color: #f9fafb;
          font-weight: 600;
        }

        .dark .markdown-preview th {
          background-color: #1f2937;
        }
      `}</style>
    </div>
  );
});

export default MarkdownPreview;
