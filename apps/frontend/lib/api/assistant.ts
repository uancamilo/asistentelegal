import apiClient from './client';

/**
 * Source reference from a RAG response
 */
export interface RagSource {
  documentId: string;
  title: string;
  documentNumber: string | null;
  chunkId: string;
  chunkIndex: number;
  score: number;
  snippet: string;
  articleRef?: string; // Reference to article anchor (e.g., "articulo-49")
}

/**
 * Response from the RAG assistant API
 */
export interface AskAssistantResponse {
  answer: string;
  sources: RagSource[];
  query: string;
  executionTimeMs: number;
}

/**
 * Request payload for the RAG assistant
 */
export interface AskAssistantRequest {
  question: string;
  maxSources?: number;
}

/**
 * Enhanced response with client-side metrics
 */
export interface AssistantResponseWithMetrics extends AskAssistantResponse {
  clientExecutionMs: number;
  networkLatencyMs: number;
}

/**
 * Error types for better error handling
 */
export type AssistantErrorType =
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

export interface AssistantError {
  type: AssistantErrorType;
  message: string;
  statusCode?: number;
  retryAfter?: number;
}

/**
 * Ask the legal assistant a question using RAG
 *
 * @param question - The legal question to ask
 * @param maxSources - Maximum number of sources to return (default: 5)
 * @returns Response with answer, sources, and timing metrics
 *
 * @example
 * ```typescript
 * const response = await askLegalAssistant(
 *   "¿Cuáles son los requisitos para constituir una empresa?"
 * );
 * console.log(response.answer);
 * console.log(response.sources);
 * ```
 */
export async function askLegalAssistant(
  question: string,
  maxSources = 5
): Promise<AssistantResponseWithMetrics> {
  const startTime = performance.now();

  // Log telemetry to console
  console.log('[Assistant] Request started', {
    questionLength: question.length,
    maxSources,
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await apiClient.post<AskAssistantResponse>('/assistant/ask', {
      question,
      maxSources,
    } as AskAssistantRequest);

    const endTime = performance.now();
    const clientExecutionMs = Math.round(endTime - startTime);
    const networkLatencyMs = Math.max(0, clientExecutionMs - response.data.executionTimeMs);

    // Log telemetry to console
    console.log('[Assistant] Request completed', {
      clientExecutionMs,
      serverExecutionMs: response.data.executionTimeMs,
      networkLatencyMs,
      sourcesCount: response.data.sources.length,
      answerLength: response.data.answer.length,
    });

    return {
      ...response.data,
      clientExecutionMs,
      networkLatencyMs,
    };
  } catch (error: unknown) {
    const endTime = performance.now();
    const clientExecutionMs = Math.round(endTime - startTime);

    // Log error telemetry
    console.error('[Assistant] Request failed', {
      clientExecutionMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Parse API error into a structured AssistantError
 */
export function parseAssistantError(error: unknown): AssistantError {
  // Network error (no response)
  if (error && typeof error === 'object' && 'code' in error) {
    const axiosError = error as { code?: string; message?: string };
    if (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNABORTED') {
      return {
        type: 'NETWORK_ERROR',
        message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
      };
    }
  }

  // HTTP error with response
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: { message?: string };
        headers?: { 'retry-after'?: string };
      };
    };

    const status = axiosError.response?.status;
    const message = axiosError.response?.data?.message;

    if (status === 429) {
      const retryAfter = axiosError.response?.headers?.['retry-after'];
      return {
        type: 'RATE_LIMIT',
        message: 'Has enviado demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.',
        statusCode: 429,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : 60,
      };
    }

    if (status === 400) {
      return {
        type: 'VALIDATION_ERROR',
        message: message || 'La pregunta no es válida. Asegúrate de que tenga al menos 10 caracteres.',
        statusCode: 400,
      };
    }

    if (status && status >= 500) {
      return {
        type: 'SERVER_ERROR',
        message: 'Ocurrió un error en el servidor. Por favor, intenta de nuevo más tarde.',
        statusCode: status,
      };
    }
  }

  // Unknown error
  return {
    type: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
  };
}

/**
 * Get a user-friendly error message
 */
export function getErrorMessage(error: AssistantError): string {
  return error.message;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AssistantError): boolean {
  return error.type === 'NETWORK_ERROR' ||
         error.type === 'SERVER_ERROR' ||
         error.type === 'RATE_LIMIT';
}
