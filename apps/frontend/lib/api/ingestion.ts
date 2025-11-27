import apiClient from './client';

/**
 * Document types available in the system
 */
export enum DocumentType {
  CONSTITUCION = 'CONSTITUCION',
  TRATADO_INTERNACIONAL = 'TRATADO_INTERNACIONAL',
  LEY_ORGANICA = 'LEY_ORGANICA',
  LEY_ORDINARIA = 'LEY_ORDINARIA',
  DECRETO_LEY = 'DECRETO_LEY',
  DECRETO = 'DECRETO',
  REGLAMENTO = 'REGLAMENTO',
  ORDENANZA = 'ORDENANZA',
  RESOLUCION = 'RESOLUCION',
  ACUERDO = 'ACUERDO',
  CIRCULAR = 'CIRCULAR',
  DIRECTIVA = 'DIRECTIVA',
  OTRO = 'OTRO',
}

/**
 * Document scope options
 */
export enum DocumentScope {
  INTERNACIONAL = 'INTERNACIONAL',
  NACIONAL = 'NACIONAL',
  REGIONAL = 'REGIONAL',
  MUNICIPAL = 'MUNICIPAL',
  LOCAL = 'LOCAL',
}

/**
 * Document status in the editorial workflow
 */
export enum DocumentStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Processing status for async document processing
 */
export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/**
 * Request to import a document from URL
 */
export interface ImportDocumentFromUrlRequest {
  url: string;
  title: string;
  type: DocumentType;
  issuingEntity: string;
  documentNumber?: string;
  scope?: DocumentScope;
  summary?: string;
}

/**
 * Response from import-url endpoint
 */
export interface ImportDocumentFromUrlResponse {
  id: string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  processingStatus: ProcessingStatus;
  embeddingStatus: ProcessingStatus;
  sourceUrl: string;
  message: string;
}

/**
 * Full document response from API
 */
export interface DocumentResponse {
  id: string;
  title: string;
  documentNumber: string | null;
  type: DocumentType;
  hierarchyLevel: number;
  scope: DocumentScope;
  issuingEntity: string;
  isActive: boolean;
  status: DocumentStatus;
  summary: string | null;
  keywords: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fullText?: string | null;
  processingStatus?: ProcessingStatus;
  embeddingStatus?: ProcessingStatus;
  embeddingError?: string | null;
  chunkCount?: number;
}

/**
 * Request to review a document
 */
export interface ReviewDocumentRequest {
  approved: boolean;
  title?: string;
  scope?: DocumentScope;
  summary?: string;
  tags?: string[];
  rejectionReason?: string;
}

/**
 * Response from review endpoint
 */
export interface ReviewDocumentResponse {
  id: string;
  title: string;
  status: DocumentStatus;
  reviewedBy: string;
  reviewedAt: string;
  rejectionReason?: string | null;
  message: string;
}

/**
 * Import a document from a URL (PDF)
 *
 * This triggers async processing:
 * 1. Download PDF
 * 2. Extract text
 * 3. Generate embeddings
 * 4. Create chunks
 *
 * @param data - Import request data
 * @returns Import response with document ID
 */
export async function importDocumentFromUrl(
  data: ImportDocumentFromUrlRequest
): Promise<ImportDocumentFromUrlResponse> {
  console.log('[Ingestion] Starting import from URL:', data.url);

  const response = await apiClient.post<ImportDocumentFromUrlResponse>(
    '/documents/import-url',
    data
  );

  console.log('[Ingestion] Import queued:', {
    id: response.data.id,
    processingStatus: response.data.processingStatus,
  });

  return response.data;
}

/**
 * Get document by ID with full details
 *
 * @param id - Document ID
 * @returns Document details including processing status
 */
export async function getDocument(id: string): Promise<DocumentResponse> {
  const response = await apiClient.get<DocumentResponse>(`/documents/${id}`);
  return response.data;
}

/**
 * Poll document status until processing is complete
 *
 * @param id - Document ID
 * @param onStatusChange - Callback for status updates
 * @param options - Polling options
 * @returns Final document state
 */
export async function pollDocumentStatus(
  id: string,
  onStatusChange?: (doc: DocumentResponse) => void,
  options: {
    intervalMs?: number;
    maxAttempts?: number;
    stopOnPublished?: boolean;
  } = {}
): Promise<DocumentResponse> {
  const {
    intervalMs = 3000,
    maxAttempts = 60, // 3 minutes max
    stopOnPublished = false,
  } = options;

  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;
        const doc = await getDocument(id);

        console.log('[Ingestion] Poll status:', {
          attempt: attempts,
          processingStatus: doc.processingStatus,
          embeddingStatus: doc.embeddingStatus,
          status: doc.status,
        });

        onStatusChange?.(doc);

        // Check if processing is complete
        const processingDone =
          doc.processingStatus === ProcessingStatus.COMPLETED ||
          doc.processingStatus === ProcessingStatus.FAILED ||
          doc.processingStatus === ProcessingStatus.SKIPPED;

        const embeddingDone =
          doc.embeddingStatus === ProcessingStatus.COMPLETED ||
          doc.embeddingStatus === ProcessingStatus.FAILED ||
          doc.embeddingStatus === ProcessingStatus.SKIPPED;

        // Stop conditions
        if (stopOnPublished && doc.status === DocumentStatus.PUBLISHED) {
          resolve(doc);
          return;
        }

        if (processingDone && embeddingDone) {
          resolve(doc);
          return;
        }

        if (attempts >= maxAttempts) {
          resolve(doc); // Return current state even if not complete
          return;
        }

        // Continue polling
        setTimeout(poll, intervalMs);
      } catch (error) {
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          // Retry on error
          setTimeout(poll, intervalMs);
        }
      }
    };

    poll();
  });
}

/**
 * Review and approve/reject a document
 *
 * @param id - Document ID
 * @param data - Review data
 * @returns Review response
 */
export async function reviewDocument(
  id: string,
  data: ReviewDocumentRequest
): Promise<ReviewDocumentResponse> {
  const response = await apiClient.patch<ReviewDocumentResponse>(
    `/documents/${id}/review`,
    data
  );

  console.log('[Ingestion] Document reviewed:', {
    id,
    approved: data.approved,
    newStatus: response.data.status,
  });

  return response.data;
}

/**
 * Publish a document (make it searchable)
 *
 * @param id - Document ID
 * @returns Updated document
 */
export async function publishDocument(id: string): Promise<DocumentResponse> {
  const response = await apiClient.patch<DocumentResponse>(
    `/documents/${id}/publish`
  );

  console.log('[Ingestion] Document published:', {
    id,
    status: response.data.status,
    publishedAt: response.data.publishedAt,
  });

  return response.data;
}

/**
 * Get document statistics (admin only)
 */
export interface DocumentStatistics {
  totalDocuments: number;
  publishedDocuments: number;
  draftDocuments: number;
  archivedDocuments: number;
  byType: Record<string, number>;
  byScope: Record<string, number>;
}

export async function getDocumentStatistics(): Promise<DocumentStatistics> {
  const response = await apiClient.get<DocumentStatistics>('/documents/stats');
  return response.data;
}

/**
 * Parse API error for ingestion
 */
export interface IngestionError {
  type: 'VALIDATION' | 'NETWORK' | 'AUTH' | 'RATE_LIMIT' | 'SERVER' | 'UNKNOWN';
  message: string;
  field?: string;
  statusCode?: number;
}

export function parseIngestionError(error: unknown): IngestionError {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: { message?: string | string[]; error?: string };
      };
      code?: string;
    };

    const status = axiosError.response?.status;
    const data = axiosError.response?.data;

    // Handle array of validation messages
    const message = Array.isArray(data?.message)
      ? data.message.join('. ')
      : data?.message || data?.error || 'Error desconocido';

    if (status === 400) {
      return { type: 'VALIDATION', message, statusCode: 400 };
    }
    if (status === 401 || status === 403) {
      return {
        type: 'AUTH',
        message: 'No tienes permisos para realizar esta acción. Verifica que tengas rol de EDITOR o superior.',
        statusCode: status,
      };
    }
    if (status === 429) {
      return {
        type: 'RATE_LIMIT',
        message: 'Has enviado demasiadas solicitudes. Espera un momento antes de intentar de nuevo.',
        statusCode: 429,
      };
    }
    if (status && status >= 500) {
      return {
        type: 'SERVER',
        message: 'Error en el servidor. Por favor, intenta de nuevo más tarde.',
        statusCode: status,
      };
    }

    if (axiosError.code === 'ERR_NETWORK') {
      return {
        type: 'NETWORK',
        message: 'No se pudo conectar con el servidor. Verifica tu conexión.',
      };
    }
  }

  return {
    type: 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Error desconocido',
  };
}

/**
 * Document type labels for UI
 */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.CONSTITUCION]: 'Constitución',
  [DocumentType.TRATADO_INTERNACIONAL]: 'Tratado Internacional',
  [DocumentType.LEY_ORGANICA]: 'Ley Orgánica',
  [DocumentType.LEY_ORDINARIA]: 'Ley Ordinaria',
  [DocumentType.DECRETO_LEY]: 'Decreto Ley',
  [DocumentType.DECRETO]: 'Decreto',
  [DocumentType.REGLAMENTO]: 'Reglamento',
  [DocumentType.ORDENANZA]: 'Ordenanza',
  [DocumentType.RESOLUCION]: 'Resolución',
  [DocumentType.ACUERDO]: 'Acuerdo',
  [DocumentType.CIRCULAR]: 'Circular',
  [DocumentType.DIRECTIVA]: 'Directiva',
  [DocumentType.OTRO]: 'Otro',
};

/**
 * Document scope labels for UI
 */
export const DOCUMENT_SCOPE_LABELS: Record<DocumentScope, string> = {
  [DocumentScope.INTERNACIONAL]: 'Internacional',
  [DocumentScope.NACIONAL]: 'Nacional',
  [DocumentScope.REGIONAL]: 'Regional',
  [DocumentScope.MUNICIPAL]: 'Municipal',
  [DocumentScope.LOCAL]: 'Local',
};

/**
 * Processing status labels for UI
 */
export const PROCESSING_STATUS_LABELS: Record<ProcessingStatus, string> = {
  [ProcessingStatus.PENDING]: 'Pendiente',
  [ProcessingStatus.PROCESSING]: 'Procesando',
  [ProcessingStatus.COMPLETED]: 'Completado',
  [ProcessingStatus.FAILED]: 'Fallido',
  [ProcessingStatus.SKIPPED]: 'Omitido',
};

// ============================================
// AUTOMATIC INGESTION TYPES AND FUNCTIONS
// ============================================

/**
 * Request for automatic document ingestion
 */
export interface IngestDocumentRequest {
  url: string;
}

/**
 * Detected document metadata from PDF analysis
 */
export interface DetectedDocumentMetadata {
  /** Detected document title */
  title: string;
  /** Document number (e.g., "Ley 123-2024") */
  documentNumber: string | null;
  /** Detected document type */
  documentType: DocumentType;
  /** Document scope */
  scope: DocumentScope;
  /** Issuing entity */
  issuingEntity: string;
  /** Publication date if detected (ISO format) */
  date: string | null;
  /** Auto-generated summary */
  summary: string;
  /** Extracted content */
  content: string;
  /** Number of chunks */
  chunksCount: number;
  /** Auto-detected keywords */
  keywords: string[];
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Response from automatic ingestion
 */
export interface IngestDocumentResponse {
  /** Whether ingestion was successful */
  success: boolean;
  /** Source URL processed */
  sourceUrl: string;
  /** Total pages in PDF */
  totalPages: number;
  /** Total characters extracted */
  totalCharacters: number;
  /** Whether multiple documents were detected */
  multipleDocumentsDetected: boolean;
  /** Detected documents (1 or more) */
  detectedDocuments: DetectedDocumentMetadata[];
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Any warnings */
  warnings: string[];
}

/**
 * Ingest document from URL with automatic metadata detection
 *
 * This endpoint:
 * 1. Downloads PDF from URL
 * 2. Extracts text content
 * 3. Uses LLM to detect document metadata
 * 4. Detects if PDF contains single or multiple documents
 * 5. Returns structured data for form pre-filling
 *
 * NOTE: This does NOT create documents in the database.
 *
 * @param url - URL of the PDF to ingest
 * @returns Ingestion response with detected documents
 */
export async function ingestDocument(
  url: string
): Promise<IngestDocumentResponse> {
  console.log('[Ingestion] Starting automatic ingestion from URL:', url);

  const response = await apiClient.post<IngestDocumentResponse>(
    '/documents/ingest',
    { url }
  );

  console.log('[Ingestion] Ingestion complete:', {
    documentsDetected: response.data.detectedDocuments.length,
    processingTimeMs: response.data.processingTimeMs,
  });

  return response.data;
}
