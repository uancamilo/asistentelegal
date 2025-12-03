'use client';

import { useState, useCallback } from 'react';
import { AutoIngestSection, MultiDocumentForm } from '@/components/editor';
import type { DetectedDocumentMetadata } from '@/lib/api/ingestion';

/**
 * NewDocumentPage - Unified document creation with auto-ingestion
 *
 * Two-section layout:
 * 1. Auto-Ingest Section (top): Paste PDF URL for automatic metadata detection
 * 2. Manual Form Section (bottom): Edit detected data or create from scratch
 *
 * Flow:
 * - idle: User can paste URL or fill form manually
 * - loading: PDF is being processed
 * - success: Form is pre-filled with detected documents
 * - manual edit: User adjusts and submits
 */
export default function NewDocumentPage() {
  const [detectedDocuments, setDetectedDocuments] = useState<DetectedDocumentMetadata[]>([]);
  const [sourceUrl, setSourceUrl] = useState<string | undefined>(undefined);
  const [hasIngested, setHasIngested] = useState(false);

  const handleIngestComplete = useCallback(
    (documents: DetectedDocumentMetadata[], url: string) => {
      setDetectedDocuments(documents);
      setSourceUrl(url);
      setHasIngested(true);
    },
    []
  );

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Crear Documento
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Importa automaticamente desde un PDF o completa el formulario manualmente
        </p>
      </div>

      {/* Section A: Auto-Ingest (top) */}
      <div className="mb-8">
        <AutoIngestSection
          onIngestComplete={handleIngestComplete}
          isDisabled={false}
        />
      </div>

      {/* Divider */}
      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
            {hasIngested ? 'Datos detectados - revisa y ajusta' : 'O completa manualmente'}
          </span>
        </div>
      </div>

      {/* Section B: Manual Form (bottom) */}
      <MultiDocumentForm
        initialDocuments={detectedDocuments}
        sourceUrl={sourceUrl}
        mode={hasIngested ? 'ingest' : 'create'}
        redirectPath="/editor"
      />
    </div>
  );
}
