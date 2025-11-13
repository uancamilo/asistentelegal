'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar, Building, Tag, Globe } from 'lucide-react'
import type { Document, DocumentType, DocumentScope, DocumentStatus } from '@/lib/types'
import { translateDocumentType, translateDocumentStatus, translateDocumentScope } from '@/lib/translations'

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

      {/* Full Text */}
      {document.fullText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contenido Completo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap font-mono text-sm">
                {document.fullText}
              </p>
            </div>
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
