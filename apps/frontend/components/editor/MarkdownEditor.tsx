'use client';

import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onScroll?: (scrollTop: number, scrollHeight: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface FormatAction {
  icon: React.ReactNode;
  label: string;
  action: 'wrap' | 'prefix' | 'insert';
  before?: string;
  after?: string;
  prefix?: string;
  text?: string;
}

const FORMAT_ACTIONS: FormatAction[] = [
  { icon: <Bold className="h-4 w-4" />, label: 'Negrita', action: 'wrap', before: '**', after: '**' },
  { icon: <Italic className="h-4 w-4" />, label: 'Cursiva', action: 'wrap', before: '_', after: '_' },
  { icon: <Heading1 className="h-4 w-4" />, label: 'Titulo 1', action: 'prefix', prefix: '# ' },
  { icon: <Heading2 className="h-4 w-4" />, label: 'Titulo 2', action: 'prefix', prefix: '## ' },
  { icon: <Heading3 className="h-4 w-4" />, label: 'Titulo 3', action: 'prefix', prefix: '### ' },
  { icon: <List className="h-4 w-4" />, label: 'Lista', action: 'prefix', prefix: '- ' },
  { icon: <ListOrdered className="h-4 w-4" />, label: 'Lista numerada', action: 'prefix', prefix: '1. ' },
  { icon: <Quote className="h-4 w-4" />, label: 'Cita', action: 'prefix', prefix: '> ' },
  { icon: <Minus className="h-4 w-4" />, label: 'Separador', action: 'insert', text: '\n\n---\n\n' },
];

/**
 * MarkdownEditor - Rich text editor with Markdown formatting toolbar
 *
 * Features:
 * - Formatting toolbar (bold, italic, headings, lists, etc.)
 * - Keyboard shortcuts
 * - Scroll sync support
 */
export function MarkdownEditor({
  value,
  onChange,
  onScroll,
  placeholder = 'Escribe el contenido en formato Markdown...',
  disabled = false,
  className = '',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<{ past: string[]; future: string[] }>({ past: [], future: [] });

  const pushToHistory = useCallback((newValue: string) => {
    if (historyRef.current.past[historyRef.current.past.length - 1] !== value) {
      historyRef.current.past.push(value);
      if (historyRef.current.past.length > 50) {
        historyRef.current.past.shift();
      }
    }
    historyRef.current.future = [];
    onChange(newValue);
  }, [value, onChange]);

  const handleUndo = useCallback(() => {
    if (historyRef.current.past.length === 0) return;
    const previous = historyRef.current.past.pop()!;
    historyRef.current.future.push(value);
    onChange(previous);
  }, [value, onChange]);

  const handleRedo = useCallback(() => {
    if (historyRef.current.future.length === 0) return;
    const next = historyRef.current.future.pop()!;
    historyRef.current.past.push(value);
    onChange(next);
  }, [value, onChange]);

  const applyFormat = useCallback((action: FormatAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    let newValue = value;
    let newCursorPos = start;

    switch (action.action) {
      case 'wrap':
        if (selectedText) {
          newValue =
            value.substring(0, start) +
            action.before + selectedText + action.after +
            value.substring(end);
          newCursorPos = end + (action.before?.length || 0) + (action.after?.length || 0);
        } else {
          const placeholder = 'texto';
          newValue =
            value.substring(0, start) +
            action.before + placeholder + action.after +
            value.substring(end);
          newCursorPos = start + (action.before?.length || 0);
        }
        break;

      case 'prefix':
        // Find line start
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = value.indexOf('\n', start);
        const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
        const currentLine = value.substring(lineStart, actualLineEnd);

        // Check if prefix already exists
        if (currentLine.startsWith(action.prefix || '')) {
          // Remove prefix
          newValue =
            value.substring(0, lineStart) +
            currentLine.substring((action.prefix || '').length) +
            value.substring(actualLineEnd);
        } else {
          // Add prefix
          newValue =
            value.substring(0, lineStart) +
            (action.prefix || '') + currentLine +
            value.substring(actualLineEnd);
        }
        newCursorPos = start + (action.prefix?.length || 0);
        break;

      case 'insert':
        newValue =
          value.substring(0, start) +
          (action.text || '') +
          value.substring(end);
        newCursorPos = start + (action.text?.length || 0);
        break;
    }

    pushToHistory(newValue);

    // Restore cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, pushToHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          applyFormat(FORMAT_ACTIONS[0]); // Bold
          break;
        case 'i':
          e.preventDefault();
          applyFormat(FORMAT_ACTIONS[1]); // Italic
          break;
        case 'z':
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
          break;
        case 'y':
          e.preventDefault();
          handleRedo();
          break;
      }
    }
  }, [applyFormat, handleUndo, handleRedo]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    onScroll?.(target.scrollTop, target.scrollHeight);
  }, [onScroll]);

  return (
    <div className={`flex flex-col h-full border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-wrap">
        {FORMAT_ACTIONS.map((action, index) => (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyFormat(action)}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title={action.label}
          >
            {action.icon}
          </Button>
        ))}
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={disabled || historyRef.current.past.length === 0}
          className="h-8 w-8 p-0"
          title="Deshacer (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRedo}
          disabled={disabled || historyRef.current.future.length === 0}
          className="h-8 w-8 p-0"
          title="Rehacer (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => pushToHistory(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 w-full p-4 resize-none focus:outline-none font-mono text-sm bg-transparent dark:text-gray-100"
        spellCheck={false}
      />
    </div>
  );
}

export default MarkdownEditor;
