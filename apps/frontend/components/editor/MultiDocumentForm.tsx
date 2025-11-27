'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { ButtonLoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Save, Plus, Trash2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { createDocument } from '@/lib/api/documents';
import {
  DetectedDocumentMetadata,
  DocumentType,
  DocumentScope,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_SCOPE_LABELS,
} from '@/lib/api/ingestion';
import type { CreateDocumentRequest } from '@/lib/types';

/**
 * Form data for a single document
 */
export interface DocumentFormData {
  id: string; // Temporary ID for React key
  title: string;
  documentNumber: string;
  type: DocumentType;
  scope: DocumentScope;
  issuingEntity: string;
  summary: string;
  fullText: string;
  keywords: string;
  date: string;
  isExpanded: boolean;
}

/**
 * Create empty document form data
 */
function createEmptyDocument(): DocumentFormData {
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: '',
    documentNumber: '',
    type: DocumentType.LEY_ORDINARIA,
    scope: DocumentScope.NACIONAL,
    issuingEntity: '',
    summary: '',
    fullText: '',
    keywords: '',
    date: '',
    isExpanded: true,
  };
}

/**
 * Convert detected metadata to form data
 */
function metadataToFormData(metadata: DetectedDocumentMetadata): DocumentFormData {
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: metadata.title || '',
    documentNumber: metadata.documentNumber || '',
    type: metadata.documentType || DocumentType.LEY_ORDINARIA,
    scope: metadata.scope || DocumentScope.NACIONAL,
    issuingEntity: metadata.issuingEntity || '',
    summary: metadata.summary || '',
    fullText: metadata.content || '',
    keywords: metadata.keywords?.join(', ') || '',
    date: metadata.date || '',
    isExpanded: true,
  };
}

interface MultiDocumentFormProps {
  initialDocuments?: DetectedDocumentMetadata[];
  sourceUrl?: string;
  mode?: 'create' | 'ingest';
  redirectPath?: string;
}

/**
 * MultiDocumentForm - Dynamic form for creating one or more documents
 *
 * Features:
 * - Add/remove document forms dynamically
 * - Collapse/expand individual documents
 * - Pre-fill from detected metadata
 * - Submit all documents at once
 */
export function MultiDocumentForm({
  initialDocuments = [],
  sourceUrl,
  mode = 'create',
  redirectPath = '/editor',
}: MultiDocumentFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentFormData[]>(() => {
    if (initialDocuments.length > 0) {
      return initialDocuments.map(metadataToFormData);
    }
    return [createEmptyDocument()];
  });

  // Update documents when initialDocuments changes (from auto-ingest)
  useEffect(() => {
    if (initialDocuments.length > 0) {
      setDocuments(initialDocuments.map(metadataToFormData));
    }
  }, [initialDocuments]);

  const updateDocument = (id: string, field: string, value: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id ? { ...doc, [field]: value } : doc
      )
    );
  };

  const toggleExpand = (id: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id ? { ...doc, isExpanded: !doc.isExpanded } : doc
      )
    );
  };

  const addDocument = () => {
    setDocuments(prev => [...prev, createEmptyDocument()]);
  };

  const removeDocument = (id: string) => {
    if (documents.length === 1) {
      addToast({
        title: 'No se puede eliminar',
        description: 'Debe haber al menos un documento',
        variant: 'destructive',
      });
      return;
    }
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const results: { title: string; success: boolean; error?: string }[] = [];

      for (const doc of documents) {
        try {
          const keywordsArray = doc.keywords
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

          const payload: CreateDocumentRequest = {
            title: doc.title,
            documentNumber: doc.documentNumber || undefined,
            type: doc.type,
            scope: doc.scope,
            issuingEntity: doc.issuingEntity,
            summary: doc.summary || undefined,
            fullText: doc.fullText || undefined,
            keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
          };

          await createDocument(payload);
          results.push({ title: doc.title, success: true });
        } catch (error: any) {
          results.push({
            title: doc.title,
            success: false,
            error: error.response?.data?.message || error.message,
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount === 0) {
        addToast({
          title: 'Documentos creados',
          description: `Se crearon ${successCount} documento(s) exitosamente`,
          variant: 'success',
        });
        router.push(redirectPath);
      } else if (successCount > 0) {
        addToast({
          title: 'Creacion parcial',
          description: `${successCount} creados, ${failCount} fallidos`,
          variant: 'default',
        });
      } else {
        addToast({
          title: 'Error',
          description: 'No se pudo crear ningun documento',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message || 'Error al crear documentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = documents.every(
    doc => doc.title.trim() && doc.issuingEntity.trim()
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Source URL indicator */}
      {sourceUrl && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
          <FileText className="h-4 w-4" />
          <span>Origen: {sourceUrl}</span>
        </div>
      )}

      {/* Document Forms */}
      {documents.map((doc, index) => (
        <Card key={doc.id} className="overflow-hidden">
          {/* Document Header */}
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors py-3"
            onClick={() => toggleExpand(doc.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                  {index + 1}
                </span>
                <div>
                  <CardTitle className="text-base">
                    {doc.title || 'Nuevo Documento'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {doc.documentNumber || 'Sin numero'} | {DOCUMENT_TYPE_LABELS[doc.type]}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {documents.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDocument(doc.id);
                    }}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {doc.isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>

          {/* Document Form Fields */}
          {doc.isExpanded && (
            <CardContent className="space-y-4 pt-0">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor={`title-${doc.id}`}>Titulo *</Label>
                <Input
                  id={`title-${doc.id}`}
                  value={doc.title}
                  onChange={(e) => updateDocument(doc.id, 'title', e.target.value)}
                  placeholder="Ej: Ley Organica de Transparencia y Acceso a la Informacion"
                  required
                  maxLength={500}
                />
              </div>

              {/* Document Number and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`documentNumber-${doc.id}`}>Numero de Documento</Label>
                  <Input
                    id={`documentNumber-${doc.id}`}
                    value={doc.documentNumber}
                    onChange={(e) => updateDocument(doc.id, 'documentNumber', e.target.value)}
                    placeholder="Ej: LEY-001-2023"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`date-${doc.id}`}>Fecha de Publicacion</Label>
                  <Input
                    id={`date-${doc.id}`}
                    type="date"
                    value={doc.date}
                    onChange={(e) => updateDocument(doc.id, 'date', e.target.value)}
                  />
                </div>
              </div>

              {/* Type and Scope */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`type-${doc.id}`}>Tipo de Documento *</Label>
                  <Select
                    value={doc.type}
                    onValueChange={(value) => updateDocument(doc.id, 'type', value)}
                    name={`type-${doc.id}`}
                  >
                    <SelectTrigger id={`type-${doc.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`scope-${doc.id}`}>Ambito *</Label>
                  <Select
                    value={doc.scope}
                    onValueChange={(value) => updateDocument(doc.id, 'scope', value)}
                    name={`scope-${doc.id}`}
                  >
                    <SelectTrigger id={`scope-${doc.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_SCOPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Issuing Entity */}
              <div className="space-y-2">
                <Label htmlFor={`issuingEntity-${doc.id}`}>Entidad Emisora *</Label>
                <Input
                  id={`issuingEntity-${doc.id}`}
                  value={doc.issuingEntity}
                  onChange={(e) => updateDocument(doc.id, 'issuingEntity', e.target.value)}
                  placeholder="Ej: Asamblea Nacional"
                  required
                  maxLength={200}
                />
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <Label htmlFor={`summary-${doc.id}`}>Resumen</Label>
                <textarea
                  id={`summary-${doc.id}`}
                  name={`summary-${doc.id}`}
                  value={doc.summary}
                  onChange={(e) => updateDocument(doc.id, 'summary', e.target.value)}
                  placeholder="Breve descripcion del documento..."
                  className="w-full min-h-[80px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                  maxLength={2000}
                />
                <p className="text-xs text-gray-500">{doc.summary.length}/2000 caracteres</p>
              </div>

              {/* Full Text */}
              <div className="space-y-2">
                <Label htmlFor={`fullText-${doc.id}`}>Texto Completo</Label>
                <textarea
                  id={`fullText-${doc.id}`}
                  name={`fullText-${doc.id}`}
                  value={doc.fullText}
                  onChange={(e) => updateDocument(doc.id, 'fullText', e.target.value)}
                  placeholder="Contenido completo del documento legal..."
                  className="w-full min-h-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500">{doc.fullText.length.toLocaleString()} caracteres</p>
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <Label htmlFor={`keywords-${doc.id}`}>Palabras Clave</Label>
                <Input
                  id={`keywords-${doc.id}`}
                  value={doc.keywords}
                  onChange={(e) => updateDocument(doc.id, 'keywords', e.target.value)}
                  placeholder="transparencia, acceso, informacion (separadas por comas)"
                />
                <p className="text-xs text-gray-500">Ingrese las palabras clave separadas por comas</p>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Add Document Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addDocument}
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" />
        Agregar otro documento
      </Button>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !isFormValid}>
          {loading ? (
            <ButtonLoadingIndicator message="Guardando" size="sm" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {documents.length === 1 ? 'Crear Documento' : `Crear ${documents.length} Documentos`}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default MultiDocumentForm;
