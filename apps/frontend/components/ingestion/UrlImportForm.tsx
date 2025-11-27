'use client';

import { useState } from 'react';
import {
  DocumentType,
  DocumentScope,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_SCOPE_LABELS,
  ImportDocumentFromUrlRequest,
} from '../../lib/api/ingestion';

interface UrlImportFormProps {
  onSubmit: (data: ImportDocumentFromUrlRequest) => Promise<void>;
  isLoading: boolean;
}

/**
 * UrlImportForm - Form to import a document from a PDF URL
 *
 * Collects:
 * - PDF URL (required)
 * - Title (required)
 * - Document type (required)
 * - Issuing entity (required)
 * - Document number (optional)
 * - Scope (optional)
 * - Summary (optional)
 */
export function UrlImportForm({ onSubmit, isLoading }: UrlImportFormProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>(DocumentType.LEY_ORDINARIA);
  const [issuingEntity, setIssuingEntity] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [scope, setScope] = useState<DocumentScope>(DocumentScope.NACIONAL);
  const [summary, setSummary] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: ImportDocumentFromUrlRequest = {
      url: url.trim(),
      title: title.trim(),
      type,
      issuingEntity: issuingEntity.trim(),
    };

    if (documentNumber.trim()) {
      data.documentNumber = documentNumber.trim();
    }
    if (scope) {
      data.scope = scope;
    }
    if (summary.trim()) {
      data.summary = summary.trim();
    }

    await onSubmit(data);
  };

  const isValidUrl = (urlString: string): boolean => {
    try {
      const parsed = new URL(urlString);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const canSubmit =
    url.trim() &&
    isValidUrl(url.trim()) &&
    title.trim() &&
    issuingEntity.trim() &&
    !isLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* URL */}
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          URL del PDF <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://ejemplo.com/documento.pdf"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
          required
        />
        {url && !isValidUrl(url) && (
          <p className="mt-1 text-xs text-red-500">Ingresa una URL válida (http:// o https://)</p>
        )}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Título del documento <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ley Orgánica de..."
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
          required
        />
      </div>

      {/* Type and Scope (side by side) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipo de documento <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as DocumentType)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="scope" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Alcance
          </label>
          <select
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as DocumentScope)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            {Object.entries(DOCUMENT_SCOPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Issuing Entity and Document Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="issuingEntity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Entidad emisora <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="issuingEntity"
            value={issuingEntity}
            onChange={(e) => setIssuingEntity(e.target.value)}
            placeholder="Asamblea Nacional"
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Número de documento
          </label>
          <input
            type="text"
            id="documentNumber"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="Ej: RO-123-2024"
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Summary */}
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Resumen (opcional)
        </label>
        <textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Breve descripción del contenido del documento..."
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          disabled={isLoading}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
          canSubmit
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Importando documento...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar desde URL
          </span>
        )}
      </button>
    </form>
  );
}

export default UrlImportForm;
