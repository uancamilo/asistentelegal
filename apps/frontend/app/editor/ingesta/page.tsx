'use client';

import { useState, useCallback } from 'react';
import { UrlImportForm } from '../../../components/ingestion/UrlImportForm';
import { DocumentStatusCard } from '../../../components/ingestion/DocumentStatusCard';
import {
  importDocumentFromUrl,
  pollDocumentStatus,
  reviewDocument,
  publishDocument,
  parseIngestionError,
  ImportDocumentFromUrlRequest,
  DocumentResponse,
  DocumentStatus,
} from '../../../lib/api/ingestion';

type IngestionStep = 'form' | 'processing' | 'review' | 'complete';

/**
 * IngestaPage - Document ingestion testing page
 *
 * Flow:
 * 1. User fills form with PDF URL and metadata
 * 2. Document is imported and processing begins
 * 3. Poll status until processing completes
 * 4. Allow review (approve/reject)
 * 5. Publish document
 */
export default function IngestaPage() {
  const [step, setStep] = useState<IngestionStep>('form');
  const [document, setDocument] = useState<DocumentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('es-EC');
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const handleImport = async (data: ImportDocumentFromUrlRequest) => {
    setError(null);
    setIsLoading(true);
    addLog(`Iniciando importación desde: ${data.url}`);

    try {
      // Step 1: Import document
      const importResponse = await importDocumentFromUrl(data);
      addLog(`Documento creado con ID: ${importResponse.id}`);
      addLog(`Estado inicial: processingStatus=${importResponse.processingStatus}`);

      setStep('processing');

      // Step 2: Poll until processing completes
      addLog('Iniciando polling de estado...');
      const finalDoc = await pollDocumentStatus(
        importResponse.id,
        (doc) => {
          setDocument(doc);
          addLog(
            `Actualización: processing=${doc.processingStatus}, embedding=${doc.embeddingStatus}`
          );
        },
        {
          intervalMs: 2000,
          maxAttempts: 90, // 3 minutes max
        }
      );

      setDocument(finalDoc);

      if (
        finalDoc.processingStatus === 'COMPLETED' &&
        finalDoc.embeddingStatus === 'COMPLETED'
      ) {
        addLog('Procesamiento completado exitosamente');
        setStep('review');
      } else if (
        finalDoc.processingStatus === 'FAILED' ||
        finalDoc.embeddingStatus === 'FAILED'
      ) {
        addLog('Error en el procesamiento');
        setError(
          finalDoc.embeddingError || 'Error durante el procesamiento del documento'
        );
      } else {
        addLog('Tiempo de espera agotado, pero el documento sigue procesándose');
      }
    } catch (err) {
      const parsed = parseIngestionError(err);
      setError(parsed.message);
      addLog(`Error: ${parsed.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!document) return;

    setError(null);
    setIsLoading(true);
    addLog('Aprobando documento...');

    try {
      const result = await reviewDocument(document.id, { approved: true });
      addLog(`Documento aprobado. Nuevo estado: ${result.status}`);

      // Refresh document state
      const updated = await pollDocumentStatus(document.id, undefined, {
        maxAttempts: 1,
      });
      setDocument(updated);

      if (updated.status === DocumentStatus.IN_REVIEW) {
        setStep('review');
      }
    } catch (err) {
      const parsed = parseIngestionError(err);
      setError(parsed.message);
      addLog(`Error al aprobar: ${parsed.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!document) return;

    setError(null);
    setIsLoading(true);
    addLog('Rechazando documento...');

    try {
      await reviewDocument(document.id, {
        approved: false,
        rejectionReason: 'Rechazado desde página de prueba de ingesta',
      });
      addLog('Documento rechazado y archivado');
      setStep('form');
      setDocument(null);
    } catch (err) {
      const parsed = parseIngestionError(err);
      setError(parsed.message);
      addLog(`Error al rechazar: ${parsed.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!document) return;

    setError(null);
    setIsLoading(true);
    addLog('Publicando documento...');

    try {
      const updated = await publishDocument(document.id);
      setDocument(updated);
      addLog(`Documento publicado: ${updated.publishedAt}`);
      setStep('complete');
    } catch (err) {
      const parsed = parseIngestionError(err);
      setError(parsed.message);
      addLog(`Error al publicar: ${parsed.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('form');
    setDocument(null);
    setError(null);
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Ingesta de Documentos
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Importa documentos PDF desde URLs para el sistema RAG
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { key: 'form', label: 'Importar' },
              { key: 'processing', label: 'Procesar' },
              { key: 'review', label: 'Revisar' },
              { key: 'complete', label: 'Publicado' },
            ].map((s, index) => {
              const isActive = s.key === step;
              const isPast =
                ['form', 'processing', 'review', 'complete'].indexOf(step) >
                ['form', 'processing', 'review', 'complete'].indexOf(s.key);

              return (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isPast
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {isPast ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : isPast
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                  {index < 3 && (
                    <div
                      className={`w-16 h-0.5 mx-4 ${
                        isPast ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form or Status */}
          <div>
            {step === 'form' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Importar desde URL
                </h2>
                <UrlImportForm onSubmit={handleImport} isLoading={isLoading} />
              </div>
            )}

            {step !== 'form' && document && (
              <DocumentStatusCard
                document={document}
                onApprove={step === 'review' ? handleApprove : undefined}
                onReject={step === 'review' ? handleReject : undefined}
                onPublish={
                  document.status === DocumentStatus.IN_REVIEW ? handlePublish : undefined
                }
                isLoading={isLoading}
              />
            )}

            {step === 'complete' && (
              <div className="mt-4">
                <button
                  onClick={handleReset}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Importar otro documento
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Logs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Log de Actividad
              </h2>
            </div>
            <div className="p-4 h-96 overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 italic">
                  Los eventos aparecerán aquí...
                </p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`${
                        log.includes('Error')
                          ? 'text-red-600 dark:text-red-400'
                          : log.includes('completado') || log.includes('publicado')
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Como usar esta herramienta
          </h3>
          <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
            <li>Pega la URL de un PDF (debe ser accesible públicamente)</li>
            <li>Completa los metadatos requeridos (título, tipo, entidad)</li>
            <li>Haz clic en &quot;Importar desde URL&quot;</li>
            <li>Espera a que se complete la extracción y generación de embeddings</li>
            <li>Revisa y aprueba el documento para enviarlo a revisión</li>
            <li>Publica el documento para que esté disponible en búsquedas</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
