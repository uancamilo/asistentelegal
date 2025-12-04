'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ButtonLoadingIndicator } from '@/components/ui/LoadingIndicator';
import { CloudDownload, Sparkles, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import {
  ingestDocument,
  IngestDocumentResponse,
  DetectedDocumentMetadata,
  parseIngestionError,
} from '@/lib/api/ingestion';

interface AutoIngestSectionProps {
  onIngestComplete: (documents: DetectedDocumentMetadata[], sourceUrl: string) => void;
  isDisabled?: boolean;
}

/**
 * AutoIngestSection - Automatic PDF ingestion with metadata detection
 *
 * Flow:
 * 1. User pastes PDF URL
 * 2. Click "Ingerir y procesar"
 * 3. Backend downloads PDF, extracts text, detects metadata with LLM
 * 4. Detected documents are returned and passed to parent for form pre-filling
 */
export function AutoIngestSection({ onIngestComplete, isDisabled = false }: AutoIngestSectionProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestDocumentResponse | null>(null);

  const isValidUrl = (urlString: string): boolean => {
    try {
      const parsed = new URL(urlString);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const canSubmit = url.trim() && isValidUrl(url.trim()) && !isLoading && !isDisabled;

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      const response = await ingestDocument(url.trim());
      setResult(response);

      if (response.success && response.detectedDocuments.length > 0) {
        onIngestComplete(response.detectedDocuments, response.sourceUrl);
      } else {
        setError('No se pudieron detectar documentos en el PDF');
      }
    } catch (err) {
      const parsed = parseIngestionError(err);
      setError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setError(null);
    setResult(null);
  };

  return (
    <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Ingesta Automatica</CardTitle>
            <CardDescription>
              Pega la URL de un PDF para detectar automaticamente los metadatos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleIngest} className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="ingest-url">URL del PDF</Label>
            <div className="flex gap-2">
              <Input
                id="ingest-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://ejemplo.com/documento.pdf"
                disabled={isLoading || isDisabled}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!canSubmit}
                className="min-w-[160px]"
              >
                {isLoading ? (
                  <ButtonLoadingIndicator message="Procesando" size="sm" />
                ) : (
                  <>
                    <CloudDownload className="h-4 w-4 mr-2" />
                    Ingerir y procesar
                  </>
                )}
              </Button>
            </div>
            {url && !isValidUrl(url) && (
              <p className="text-xs text-red-500">Ingresa una URL valida (http:// o https://)</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Error en la ingesta</p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Success Result */}
          {result && result.success && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Ingesta completada en {(result.processingTimeMs / 1000).toFixed(1)}s
                  </p>
                  <div className="mt-1 text-sm text-green-700 dark:text-green-300 space-y-0.5">
                    <p>{result.totalPages} paginas | {result.totalCharacters.toLocaleString()} caracteres</p>
                    <p className="font-medium">
                      {result.detectedDocuments.length} documento(s) detectado(s)
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-green-700 hover:text-green-800"
                >
                  Nueva ingesta
                </Button>
              </div>

              {/* Detected Documents Summary */}
              <div className="grid gap-2 max-w-full overflow-hidden">
                {result.detectedDocuments.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg w-full max-w-full overflow-hidden"
                  >
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {doc.documentNumber || 'Sin numero'} | {doc.issuingEntity}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded flex-shrink-0 whitespace-nowrap">
                      {Math.round(doc.confidence * 100)}% confianza
                    </span>
                  </div>
                ))}
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  {result.warnings.map((warning, i) => (
                    <p key={i}>Nota: {warning}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Procesando documento...
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    Descargando PDF, extrayendo texto, detectando metadatos con IA
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export default AutoIngestSection;
