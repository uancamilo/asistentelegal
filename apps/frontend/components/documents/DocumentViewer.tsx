'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar, Building, Tag, Globe } from 'lucide-react'
import type { Document, DocumentType, DocumentScope, DocumentStatus } from '@/lib/types'
import { translateDocumentType, translateDocumentStatus, translateDocumentScope } from '@/lib/translations'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface DocumentViewerProps {
  document: Document
}

export default function DocumentViewer({ document }: DocumentViewerProps) {
  const getStatusBadge = (status: DocumentStatus) => {
    const variants: Record<DocumentStatus, { variant: any }> = {
      DRAFT: { variant: 'secondary' },
      PUBLISHED: { variant: 'success' },
      ARCHIVED: { variant: 'default' },
    }
    const config = variants[status]
    return <Badge variant={config.variant}>{translateDocumentStatus(status)}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-2xl">{document.title}</CardTitle>
              </div>
              {document.documentNumber && (
                <p className="text-sm text-gray-500 mt-2">
                  Número: <span className="font-medium">{document.documentNumber}</span>
                </p>
              )}
            </div>
            {getStatusBadge(document.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Type */}
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Tipo</p>
                <p className="font-medium">{translateDocumentType(document.type)}</p>
              </div>
            </div>

            {/* Scope */}
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Ámbito</p>
                <p className="font-medium">{translateDocumentScope(document.scope)}</p>
              </div>
            </div>

            {/* Issuing Entity */}
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Entidad Emisora</p>
                <p className="font-medium">{document.issuingEntity}</p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Fecha de Creación</p>
                <p className="font-medium">
                  {new Date(document.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Keywords */}
          {document.keywords && document.keywords.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Palabras Clave</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {document.keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {document.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{document.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Full Text - Markdown Rendered */}
      {document.fullText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contenido Completo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none document-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {document.fullText}
              </ReactMarkdown>
            </div>
            <style jsx global>{`
              .document-content {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
              }

              .document-content h1 {
                font-size: 1.75rem;
                font-weight: 700;
                margin-top: 1.5rem;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 2px solid #e5e7eb;
              }

              .document-content h2 {
                font-size: 1.4rem;
                font-weight: 600;
                margin-top: 1.25rem;
                margin-bottom: 0.75rem;
                color: #374151;
              }

              .dark .document-content h2 {
                color: #d1d5db;
              }

              .document-content h3 {
                font-size: 1.15rem;
                font-weight: 600;
                margin-top: 1rem;
                margin-bottom: 0.5rem;
                color: #1f2937;
              }

              .dark .document-content h3 {
                color: #e5e7eb;
              }

              .document-content p {
                margin-bottom: 0.75rem;
                line-height: 1.7;
                text-align: justify;
              }

              .document-content ul, .document-content ol {
                margin-left: 1.5rem;
                margin-bottom: 0.75rem;
              }

              .document-content li {
                margin-bottom: 0.25rem;
              }

              .document-content blockquote {
                border-left: 4px solid #3b82f6;
                padding-left: 1rem;
                margin-left: 0;
                margin-right: 0;
                font-style: italic;
                color: #6b7280;
                background-color: #f9fafb;
                padding: 0.5rem 1rem;
                border-radius: 0 0.25rem 0.25rem 0;
              }

              .dark .document-content blockquote {
                background-color: #1f2937;
                color: #9ca3af;
              }

              .document-content hr {
                margin: 1.5rem 0;
                border-color: #e5e7eb;
              }

              .dark .document-content hr {
                border-color: #374151;
              }

              .document-content strong {
                font-weight: 600;
              }

              .document-content table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 1rem;
              }

              .document-content th, .document-content td {
                border: 1px solid #e5e7eb;
                padding: 0.5rem;
                text-align: left;
              }

              .dark .document-content th, .dark .document-content td {
                border-color: #374151;
              }

              .document-content th {
                background-color: #f9fafb;
                font-weight: 600;
              }

              .dark .document-content th {
                background-color: #1f2937;
              }
            `}</style>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metadatos</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Nivel Jerárquico</dt>
              <dd className="mt-1 text-sm text-gray-900">{document.hierarchyLevel}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Estado Activo</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {document.isActive ? 'Sí' : 'No'}
              </dd>
            </div>
            {document.publishedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Fecha de Publicación</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(document.publishedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Última Actualización</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(document.updatedAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
