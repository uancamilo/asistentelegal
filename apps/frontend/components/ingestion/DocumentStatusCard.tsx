'use client';

import {
  DocumentResponse,
  DocumentStatus,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_SCOPE_LABELS,
} from '../../lib/api/ingestion';
import { ProcessingStatus } from './ProcessingStatus';

interface DocumentStatusCardProps {
  document: DocumentResponse;
  onApprove?: () => void;
  onReject?: () => void;
  onPublish?: () => void;
  isLoading?: boolean;
}

/**
 * DocumentStatusCard - Displays document details and processing status
 *
 * Shows:
 * - Document metadata (title, type, scope)
 * - Processing status (extraction, embeddings)
 * - Editorial status (DRAFT, IN_REVIEW, PUBLISHED)
 * - Action buttons for review/publish
 */
export function DocumentStatusCard({
  document,
  onApprove,
  onReject,
  onPublish,
  isLoading = false,
}: DocumentStatusCardProps) {
  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.DRAFT:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            Borrador
          </span>
        );
      case DocumentStatus.IN_REVIEW:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
            En Revisión
          </span>
        );
      case DocumentStatus.PUBLISHED:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
            Publicado
          </span>
        );
      case DocumentStatus.ARCHIVED:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            Archivado
          </span>
        );
    }
  };

  const canApprove =
    document.status === DocumentStatus.DRAFT &&
    document.processingStatus === 'COMPLETED' &&
    document.embeddingStatus === 'COMPLETED';

  const canPublish = document.status === DocumentStatus.IN_REVIEW;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {document.title}
            </h3>
            {document.documentNumber && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {document.documentNumber}
              </p>
            )}
          </div>
          {getStatusBadge(document.status)}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {DOCUMENT_TYPE_LABELS[document.type]}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Alcance:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {DOCUMENT_SCOPE_LABELS[document.scope]}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Entidad:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {document.issuingEntity}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">ID:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100 font-mono text-xs">
              {document.id.substring(0, 8)}...
            </span>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Processing Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Estado de Procesamiento
          </h4>
          <ProcessingStatus
            label="Extracción"
            status={document.processingStatus}
          />
          <ProcessingStatus
            label="Embeddings"
            status={document.embeddingStatus}
            error={document.embeddingError}
          />
          {document.chunkCount !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[100px]">
                Chunks:
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {document.chunkCount} fragmentos
              </span>
            </div>
          )}
        </div>

        {/* Summary */}
        {document.summary && (
          <>
            <hr className="border-gray-200 dark:border-gray-700" />
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resumen
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                {document.summary}
              </p>
            </div>
          </>
        )}

        {/* Keywords */}
        {document.keywords && document.keywords.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Palabras clave
            </h4>
            <div className="flex flex-wrap gap-1">
              {document.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-gray-400 dark:text-gray-500 pt-2">
          Creado: {new Date(document.createdAt).toLocaleString('es-EC')}
          {document.publishedAt && (
            <> | Publicado: {new Date(document.publishedAt).toLocaleString('es-EC')}</>
          )}
        </div>
      </div>

      {/* Actions */}
      {(canApprove || canPublish) && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-2">
          {canApprove && onReject && (
            <button
              onClick={onReject}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              Rechazar
            </button>
          )}
          {canApprove && onApprove && (
            <button
              onClick={onApprove}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Aprobando...' : 'Aprobar'}
            </button>
          )}
          {canPublish && onPublish && (
            <button
              onClick={onPublish}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Publicando...' : 'Publicar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default DocumentStatusCard;
