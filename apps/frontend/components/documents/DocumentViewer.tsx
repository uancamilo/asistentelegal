'use client'

import { useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar, Building, Tag, Globe, ExternalLink } from 'lucide-react'
import type { Document, DocumentType, DocumentScope, DocumentStatus } from '@/lib/types'
import { translateDocumentType, translateDocumentStatus, translateDocumentScope } from '@/lib/translations'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface DocumentViewerProps {
  document: Document
}

/**
 * Hook to scroll to anchor on page load
 */
function useScrollToAnchor() {
  useEffect(() => {
    // Wait for content to render
    const timer = setTimeout(() => {
      const hash = window.location.hash
      if (hash) {
        const element = document.getElementById(hash.slice(1))
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          // Highlight the element briefly
          element.style.backgroundColor = '#fef08a'
          setTimeout(() => {
            element.style.backgroundColor = ''
            element.style.transition = 'background-color 0.5s ease'
          }, 2000)
        }
      }
    }, 500) // Wait for markdown to render

    return () => clearTimeout(timer)
  }, [])
}

/**
 * Process text to add IDs to articles and paragraphs for anchor navigation
 * Uses regex replacement to handle articles that may not be at line start
 */
function addArticleIds(text: string): string {
  let result = text

  // Replace ARTÍCULO patterns with HTML headings containing IDs
  // Matches: "ARTÍCULO 43." or "ARTICULO 43" or "Art. 43" at line start or after newline
  result = result.replace(
    /(\n|^)(ART[ÍI]CULO|ARTICULO)\s+(\d+)\.?/gi,
    (_match, prefix, _word, num) => `${prefix}<h3 id="articulo-${num}">ARTÍCULO ${num}.</h3>\n`
  )

  // Also handle "Art. X" format
  result = result.replace(
    /(\n|^)Art\.\s*(\d+)\.?/gi,
    (_match, prefix, num) => `${prefix}<h3 id="articulo-${num}">Art. ${num}.</h3>\n`
  )

  // Handle PARÁGRAFO patterns
  result = result.replace(
    /(\n|^)(PAR[ÁA]GRAFO)\s+(\d+)?\.?/gi,
    (_match, prefix, _word, num) => {
      const paraNum = num || '1'
      return `${prefix}<h4 id="paragrafo-${paraNum}">PARÁGRAFO ${paraNum}.</h4>\n`
    }
  )

  // Handle PARÁGRAFO TRANSITORIO
  result = result.replace(
    /(\n|^)(PAR[ÁA]GRAFO TRANSITORIO)\s*(\d+)?\.?/gi,
    (_match, prefix, _word, num) => {
      const paraNum = num || '1'
      return `${prefix}<h4 id="paragrafo-transitorio-${paraNum}">PARÁGRAFO TRANSITORIO ${paraNum}.</h4>\n`
    }
  )

  // Handle CAPÍTULO patterns
  result = result.replace(
    /(\n|^)(CAP[ÍI]TULO)\s+([IVXLCDM\d]+)/gi,
    (_match, prefix, word, num) => `${prefix}\n## ${word} ${num}\n`
  )

  // Handle TÍTULO patterns
  result = result.replace(
    /(\n|^)(T[ÍI]TULO)\s+([IVXLCDM\d]+)/gi,
    (_match, prefix, word, num) => `${prefix}\n## ${word} ${num}\n`
  )

  return result
}

export default function DocumentViewer({ document: doc }: DocumentViewerProps) {
  // Scroll to anchor when page loads with hash
  useScrollToAnchor()

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
                <CardTitle className="text-2xl">{doc.title}</CardTitle>
              </div>
              {doc.documentNumber && (
                <p className="text-sm text-gray-500 mt-2">
                  Número: <span className="font-medium">{doc.documentNumber}</span>
                </p>
              )}
            </div>
            {getStatusBadge(doc.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Type */}
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Tipo</p>
                <p className="font-medium">{translateDocumentType(doc.type)}</p>
              </div>
            </div>

            {/* Scope */}
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Ámbito</p>
                <p className="font-medium">{translateDocumentScope(doc.scope)}</p>
              </div>
            </div>

            {/* Issuing Entity */}
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Entidad Emisora</p>
                <p className="font-medium">{doc.issuingEntity}</p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Fecha de Creación</p>
                <p className="font-medium">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Keywords */}
          {doc.keywords && doc.keywords.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Palabras Clave</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {doc.keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Source URL */}
          {doc.sourceUrl && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Fuente Original</p>
              </div>
              <a
                href={doc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                {doc.sourceUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {doc.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{doc.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Full Text - Markdown Rendered */}
      {doc.fullText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contenido Completo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none document-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {useMemo(() => addArticleIds(doc.fullText || ''), [doc.fullText])}
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
              <dd className="mt-1 text-sm text-gray-900">{doc.hierarchyLevel}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Estado Activo</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {doc.isActive ? 'Sí' : 'No'}
              </dd>
            </div>
            {doc.publishedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Fecha de Publicación</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(doc.publishedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Última Actualización</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(doc.updatedAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
