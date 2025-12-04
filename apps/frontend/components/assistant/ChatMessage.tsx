'use client';

import { useMemo } from 'react';
import type { RagSource } from '../../lib/api/assistant';
import { SourceList } from './SourceList';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  message: string;
  sources?: RagSource[];
  timestamp?: string;
  isError?: boolean;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const processInlineFormatting = (line: string, key: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let partIndex = 0;

    while (remaining.includes('[') && remaining.includes('](')) {
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
      const match = remaining.match(linkRegex);
      if (!match) break;

      const beforeLink = remaining.substring(0, match.index);
      if (beforeLink) {
        parts.push(beforeLink);
      }

      const linkText = match[1];
      const linkUrl = match[2];

      parts.push(
        <a
          key={`${key}-link-${partIndex++}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline break-words"
        >
          {linkText}
        </a>
      );

      remaining = remaining.substring((match.index || 0) + match[0].length);
    }

    while (remaining.includes('**')) {
      const startIdx = remaining.indexOf('**');
      const endIdx = remaining.indexOf('**', startIdx + 2);
      if (endIdx === -1) break;

      if (startIdx > 0) {
        parts.push(remaining.substring(0, startIdx));
      }
      parts.push(
        <strong key={`${key}-b-${partIndex++}`} className="font-semibold">
          {remaining.substring(startIdx + 2, endIdx)}
        </strong>
      );
      remaining = remaining.substring(endIdx + 2);
    }

    if (remaining.includes('*')) {
      const processed: React.ReactNode[] = [];
      const segments = remaining.split(/\*([^*]+)\*/g);
      segments.forEach((segment, idx) => {
        if (idx % 2 === 1) {
          processed.push(
            <em key={`${key}-i-${partIndex++}`} className="italic">
              {segment}
            </em>
          );
        } else if (segment) {
          processed.push(segment);
        }
      });
      if (processed.length > 0) {
        parts.push(...processed);
        remaining = '';
      }
    }

    if (remaining.includes('`')) {
      const processed: React.ReactNode[] = [];
      const segments = remaining.split(/`([^`]+)`/g);
      segments.forEach((segment, idx) => {
        if (idx % 2 === 1) {
          processed.push(
            <code key={`${key}-c-${partIndex++}`} className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs sm:text-sm font-mono break-all">
              {segment}
            </code>
          );
        } else if (segment) {
          processed.push(segment);
        }
      });
      if (processed.length > 0) {
        parts.push(...processed);
        remaining = '';
      }
    }

    if (remaining) {
      parts.push(remaining);
    }

    return parts.length > 0 ? parts : line;
  };

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListComponent = listType === 'ol' ? 'ol' : 'ul';
      const listClass = listType === 'ol' ? 'list-decimal' : 'list-disc';
      elements.push(
        <ListComponent key={`list-${elements.length}`} className={`${listClass} ml-4 sm:ml-5 my-2 space-y-1`}>
          {listItems.map((item, idx) => (
            <li key={idx} className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">
              {processInlineFormatting(item, `li-${elements.length}-${idx}`)}
            </li>
          ))}
        </ListComponent>
      );
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(trimmedLine.substring(2));
      return;
    }

    const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(orderedMatch[2]);
      return;
    }

    // Empty line: only add <br> if we're NOT inside a list
    if (trimmedLine === '') {
      if (!listType) {
        elements.push(<br key={`br-${lineIndex}`} />);
      }
      return;
    }

    // Non-list, non-empty content: flush the list first
    flushList();

    if (trimmedLine.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${lineIndex}`} className="font-semibold text-gray-900 dark:text-gray-100 mt-2 sm:mt-3 mb-1 text-sm sm:text-base">
          {processInlineFormatting(trimmedLine.substring(4), `h4-${lineIndex}`)}
        </h4>
      );
      return;
    }
    if (trimmedLine.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${lineIndex}`} className="font-bold text-gray-900 dark:text-gray-100 mt-3 sm:mt-4 mb-1 sm:mb-2 text-base sm:text-lg">
          {processInlineFormatting(trimmedLine.substring(3), `h3-${lineIndex}`)}
        </h3>
      );
      return;
    }

    elements.push(
      <p key={`p-${lineIndex}`} className="mb-1.5 sm:mb-2 last:mb-0">
        {processInlineFormatting(line, `p-${lineIndex}`)}
      </p>
    );
  });

  flushList();

  return elements;
}

export function ChatMessage({
  role,
  message,
  sources,
  timestamp,
  isError = false,
}: ChatMessageProps) {
  const isUser = role === 'user';

  const renderedMessage = useMemo(() => {
    if (isUser) {
      return <p className="whitespace-pre-wrap break-words">{message}</p>;
    }
    return <div className="prose-sm dark:prose-invert max-w-none break-words">{renderMarkdown(message)}</div>;
  }, [message, isUser]);

  return (
    <div className={`flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar - Smaller on mobile */}
      <div
        className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-gray-600 dark:bg-gray-500'
            : isError
            ? 'bg-red-600'
            : 'bg-blue-600'
        }`}
      >
        {isUser ? (
          <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        )}
      </div>

      {/* Message content - Responsive width */}
      <div
        className={`flex-1 max-w-[90%] sm:max-w-[85%] ${
          isUser
            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
            : isError
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl rounded-tl-sm'
            : 'bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm'
        } px-3 py-2 sm:px-4 sm:py-3`}
      >
        {/* Message text */}
        <div
          className={`text-sm sm:text-base leading-relaxed ${
            isUser
              ? 'text-white'
              : isError
              ? 'text-red-800 dark:text-red-200'
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {renderedMessage}
        </div>

        {/* Sources */}
        {!isUser && sources && sources.length > 0 && <SourceList sources={sources} />}

        {/* Timestamp */}
        {timestamp && (
          <div
            className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs ${
              isUser ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {new Date(timestamp).toLocaleTimeString('es-EC', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
