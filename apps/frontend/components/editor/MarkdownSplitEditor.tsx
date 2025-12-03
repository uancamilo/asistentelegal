'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { Label } from '@/components/ui/label';
import { Eye, Edit3 } from 'lucide-react';

interface MarkdownSplitEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  debounceMs?: number;
}

/**
 * MarkdownSplitEditor - Split view with editor and synchronized preview
 *
 * Features:
 * - Left: Markdown editor with formatting toolbar
 * - Right: Live preview with rendered Markdown (debounced for performance)
 * - Synchronized scrolling between panels
 * - Optimized for large documents
 */
export function MarkdownSplitEditor({
  value,
  onChange,
  label = 'Contenido del Documento',
  disabled = false,
  className = '',
  debounceMs = 300,
}: MarkdownSplitEditorProps) {
  const [scrollRatio, setScrollRatio] = useState<number>(0);
  const [activePanel, setActivePanel] = useState<'editor' | 'preview'>('editor');

  // Debounced preview content - only updates after user stops typing
  const [debouncedContent, setDebouncedContent] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update debounced content with delay
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedContent(value);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, debounceMs]);

  // Sync debounced content immediately on mount or when value changes significantly
  useEffect(() => {
    // If value is completely different (e.g., loading new document), update immediately
    if (Math.abs(value.length - debouncedContent.length) > 1000) {
      setDebouncedContent(value);
    }
  }, [value, debouncedContent.length]);

  const handleEditorScroll = useCallback((scrollTop: number, scrollHeight: number) => {
    if (activePanel === 'editor') {
      const maxScroll = scrollHeight - 400;
      const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
      setScrollRatio(Math.min(Math.max(ratio, 0), 1));
    }
  }, [activePanel]);

  const handlePreviewScroll = useCallback((scrollTop: number, scrollHeight: number) => {
    if (activePanel === 'preview') {
      const maxScroll = scrollHeight - 400;
      const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
      setScrollRatio(Math.min(Math.max(ratio, 0), 1));
    }
  }, [activePanel]);

  // Memoize stats to avoid recalculating on every render
  const stats = useMemo(() => {
    const charCount = value.length;
    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
    const lineCount = value.split('\n').length;
    return { charCount, wordCount, lineCount };
  }, [value]);

  // Show indicator when preview is updating
  const isPreviewUpdating = value !== debouncedContent;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header with label and stats */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>{stats.charCount.toLocaleString()} caracteres</span>
          <span>{stats.wordCount.toLocaleString()} palabras</span>
          <span>{stats.lineCount} lineas</span>
        </div>
      </div>

      {/* Split View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor Panel */}
        <div
          className="relative"
          onMouseEnter={() => setActivePanel('editor')}
          onFocus={() => setActivePanel('editor')}
        >
          <div className="absolute top-0 left-0 z-10 flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-tl-lg rounded-br-lg">
            <Edit3 className="h-3 w-3" />
            Editor
          </div>
          <div className="h-[400px] lg:h-[500px]">
            <MarkdownEditor
              value={value}
              onChange={onChange}
              onScroll={handleEditorScroll}
              disabled={disabled}
              placeholder="Escribe o edita el contenido en formato Markdown..."
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div
          className="relative"
          onMouseEnter={() => setActivePanel('preview')}
          onFocus={() => setActivePanel('preview')}
        >
          <div className="absolute top-0 left-0 z-10 flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-tl-lg rounded-br-lg">
            <Eye className="h-3 w-3" />
            Vista Previa
            {isPreviewUpdating && (
              <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Actualizando..." />
            )}
          </div>
          <div className="h-[400px] lg:h-[500px]">
            <MarkdownPreview
              content={debouncedContent}
              scrollRatio={activePanel === 'editor' ? scrollRatio : undefined}
              onScroll={handlePreviewScroll}
            />
          </div>
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Usa la barra de herramientas o atajos (Ctrl+B negrita, Ctrl+I cursiva) para formatear. La vista previa se actualiza automaticamente.
      </p>
    </div>
  );
}

export default MarkdownSplitEditor;
