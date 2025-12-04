'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface UserInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

/**
 * UserInput - Text input component for sending messages to the assistant
 *
 * Features:
 * - Auto-resizing textarea
 * - Submit with Enter (Shift+Enter for new line)
 * - Disabled state during loading
 * - Character counter
 */
export function UserInput({
  onSubmit,
  isLoading,
  placeholder = 'Escribe tu pregunta legal aquí...',
}: UserInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MIN_LENGTH = 10;
  const MAX_LENGTH = 1000;

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [message, adjustHeight]);

  // Focus textarea on mount
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = useCallback(() => {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < MIN_LENGTH || isLoading) {
      return;
    }
    onSubmit(trimmedMessage);
    setMessage('');
    // Reset height after submit
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, isLoading, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = message.trim().length >= MIN_LENGTH && !isLoading;
  const charCount = message.length;
  const isNearLimit = charCount > MAX_LENGTH * 0.8;
  const isOverLimit = charCount > MAX_LENGTH;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className={`w-full resize-none rounded-xl border ${
              isOverLimit
                ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
            } bg-gray-50 dark:bg-gray-800 px-4 py-3 pr-24 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          />

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`absolute right-2 bottom-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              canSubmit
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Pensando...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Enviar</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </span>
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-gray-400 dark:text-gray-500">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </span>
          <span
            className={`${
              isOverLimit
                ? 'text-red-500'
                : isNearLimit
                ? 'text-yellow-500'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {charCount}/{MAX_LENGTH}
          </span>
        </div>

        {/* Validation message */}
        {message.length > 0 && message.length < MIN_LENGTH && (
          <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
            La pregunta debe tener al menos {MIN_LENGTH} caracteres ({MIN_LENGTH - message.length} más)
          </p>
        )}
      </div>
    </div>
  );
}

export default UserInput;
