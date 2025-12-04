'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, LoadingBubble, UserInput } from '../../components/assistant';
import {
  askLegalAssistant,
  parseAssistantError,
  isRetryableError,
  type RagSource,
  type AssistantError,
} from '../../lib/api/assistant';

/**
 * Chat message structure for state management
 */
interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  sources?: RagSource[];
  createdAt: string;
  isError?: boolean;
}

/**
 * LocalStorage key for chat persistence
 */
const STORAGE_KEY = 'asistente-legal-chat';

/**
 * Generate unique ID for messages
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * AssistantPage - Main page for the Legal AI Assistant
 *
 * Features:
 * - Chat-style interface for legal questions
 * - RAG-powered responses with source citations
 * - Local storage persistence for chat history
 * - Error handling with retry capability
 * - Loading states with animated indicator
 */
export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<AssistantError | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore chat from localStorage on mount
  useEffect(() => {
    setIsHydrated(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessageData[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Persist chat to localStorage when messages change
  useEffect(() => {
    if (isHydrated && messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [messages, isHydrated]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  /**
   * Add a user message to the chat
   */
  const addUserMessage = useCallback((message: string): string => {
    const id = generateId();
    const newMessage: ChatMessageData = {
      id,
      role: 'user',
      message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return id;
  }, []);

  /**
   * Add an assistant message to the chat
   */
  const addAssistantMessage = useCallback(
    (message: string, sources?: RagSource[], isError = false) => {
      const newMessage: ChatMessageData = {
        id: generateId(),
        role: 'assistant',
        message,
        sources,
        createdAt: new Date().toISOString(),
        isError,
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    []
  );

  /**
   * Handle sending a message to the assistant
   */
  const handleSendMessage = useCallback(
    async (question: string) => {
      if (isLoading) return;

      setLastError(null);
      addUserMessage(question);
      setIsLoading(true);

      try {
        const response = await askLegalAssistant(question);
        addAssistantMessage(response.answer, response.sources);
      } catch (error) {
        const parsedError = parseAssistantError(error);
        setLastError(parsedError);
        addAssistantMessage(parsedError.message, undefined, true);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, addUserMessage, addAssistantMessage]
  );

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    // Find the last user message and retry
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      // Remove the error message
      setMessages((prev) => prev.filter((m) => !m.isError));
      setLastError(null);
      handleSendMessage(lastUserMessage.message);
    }
  }, [messages, handleSendMessage]);

  /**
   * Start a new conversation
   */
  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setLastError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Asistente Legal Inteligente
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Consultas basadas en normativa almacenada en la base de datos
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleNewConversation}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Nueva conversación</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Chat container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="max-w-4xl mx-auto">
          {/* Empty state */}
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                ¿En qué puedo ayudarte?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                Soy tu asistente legal especializado en normativa ecuatoriana. Puedo responder
                preguntas sobre leyes, regulaciones y procedimientos legales.
              </p>

              {/* Example questions */}
              <div className="space-y-2">
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
                  Ejemplos de preguntas:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    '¿Cuáles son los requisitos para constituir una empresa?',
                    '¿Qué dice la ley sobre contratos laborales?',
                    '¿Cómo se registra una marca comercial?',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => handleSendMessage(example)}
                      className="text-sm px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              message={msg.message}
              sources={msg.sources}
              timestamp={msg.createdAt}
              isError={msg.isError}
            />
          ))}

          {/* Loading indicator */}
          {isLoading && <LoadingBubble />}

          {/* Retry button for retryable errors */}
          {lastError && isRetryableError(lastError) && !isLoading && (
            <div className="flex justify-center mt-4">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Reintentar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <UserInput onSubmit={handleSendMessage} isLoading={isLoading} />

      {/* Footer disclaimer */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2">
        <p className="text-xs text-center text-gray-400 dark:text-gray-500 max-w-4xl mx-auto">
          Las respuestas se generan con inteligencia artificial basándose en documentos legales
          publicados. Para decisiones legales importantes, consulte con un abogado.
        </p>
      </div>
    </div>
  );
}
