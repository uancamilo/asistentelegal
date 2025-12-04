'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface UserInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function UserInput({
  onSubmit,
  isLoading,
  placeholder = 'Escribe tu pregunta legal...',
}: UserInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MIN_LENGTH = 10;
  const MAX_LENGTH = 1000;

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [message, adjustHeight]);

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
    <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-2">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className={`flex-1 resize-none rounded-xl sm:rounded-2xl border ${
              isOverLimit
                ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
            } bg-gray-50 dark:bg-gray-800 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            style={{ minHeight: '44px' }}
          />

          {/* Submit button - Icon only on mobile */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label={isLoading ? 'Procesando' : 'Enviar mensaje'}
            className={`flex-shrink-0 flex items-center justify-center rounded-xl sm:rounded-lg transition-all active:scale-95 ${
              canSubmit
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            } w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="hidden sm:inline sm:ml-2 text-sm font-medium">Pensando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="hidden sm:inline sm:ml-2 text-sm font-medium">Enviar</span>
              </>
            )}
          </button>
        </div>

        {/* Footer info - Simplified on mobile */}
        <div className="flex items-center justify-between mt-1.5 sm:mt-2 text-[10px] sm:text-xs">
          <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">
            Enter para enviar, Shift+Enter para nueva línea
          </span>
          <span className="text-gray-400 dark:text-gray-500 sm:hidden">
            Enter = enviar
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
          <p className="mt-1 text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400">
            Mínimo {MIN_LENGTH} caracteres ({MIN_LENGTH - message.length} más)
          </p>
        )}
      </div>
    </div>
  );
}

export default UserInput;
