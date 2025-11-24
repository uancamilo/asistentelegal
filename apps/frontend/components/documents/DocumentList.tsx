'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ComponentLoadingIndicator } from '@/components/ui/LoadingIndicator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Edit, Eye, Archive, CheckCircle, FileText, SlidersHorizontal, Sparkles } from 'lucide-react'
import { publishDocument, archiveDocument } from '@/lib/api/documents'
import type { Document, DocumentType, DocumentStatus, DocumentScope } from '@/lib/types'
import { translateDocumentType, translateDocumentStatus, translateDocumentScope } from '@/lib/translations'
import { useDocumentSearch } from '@/lib/hooks/useDocumentSearch'

interface DocumentListProps {
  showActions?: boolean
  basePath?: string
  canCreate?: boolean
  canEdit?: boolean
  canPublish?: boolean
  canArchive?: boolean
  autoLoad?: boolean // Si true, carga documentos al montar. Si false, requiere búsqueda del usuario
}

export default function DocumentList({
  showActions = true,
  basePath = '/documentos',
  canCreate = true,
  canEdit = true,
  canPublish = false,
  canArchive = false,
  autoLoad = false,
}: DocumentListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  // Initialize state from URL params
  const initialQ = searchParams.get('q') || ''
  const initialTipo = searchParams.get('tipo') || 'all'
  const initialScope = searchParams.get('scope') || 'all'
  const initialStatus = searchParams.get('status') || 'all'
  const hasInitialFilters = !!initialQ || initialTipo !== 'all' || initialScope !== 'all' || initialStatus !== 'all'

  const [inputValue, setInputValue] = useState(initialQ)
  const [searchTerm, setSearchTerm] = useState(initialQ)
  const [typeFilter, setTypeFilter] = useState<string>(initialTipo)
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [scopeFilter, setScopeFilter] = useState<string>(initialScope)
  const [page, setPage] = useState(1)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [hasSearched, setHasSearched] = useState(autoLoad || hasInitialFilters)

  // Usar SWR para búsqueda con caché inteligente
  const {
    documents,
    total,
    totalPages,
    isSemanticSearch,
    executionTime: searchExecutionTime,
    isLoading: loading,
    mutate,
  } = useDocumentSearch({
    searchTerm,
    typeFilter,
    scopeFilter,
    statusFilter,
    page,
    enabled: hasSearched,
  })

  // Reset page cuando cambien filtros
  useEffect(() => {
    if (hasSearched) {
      setPage(1)
    }
  }, [typeFilter, statusFilter, scopeFilter, searchTerm])

  // Sync state from URL when searchParams change (back/forward navigation)
  useEffect(() => {
    const q = searchParams.get('q') || ''
    const tipo = searchParams.get('tipo') || 'all'
    const scope = searchParams.get('scope') || 'all'
    const status = searchParams.get('status') || 'all'

    setInputValue(q)
    setSearchTerm(q)
    setTypeFilter(tipo)
    setScopeFilter(scope)
    setStatusFilter(status)

    const hasFilters = !!q || tipo !== 'all' || scope !== 'all' || status !== 'all'
    setHasSearched(autoLoad || hasFilters)
  }, [searchParams, autoLoad])

  // Function to update URL with search params
  const updateURL = (newSearchTerm: string, newType: string, newScope: string, newStatus: string) => {
    const params = new URLSearchParams()

    if (newSearchTerm) params.set('q', newSearchTerm)
    if (newType !== 'all') params.set('tipo', newType)
    if (newScope !== 'all') params.set('scope', newScope)
    if (newStatus !== 'all') params.set('status', newStatus)

    const queryString = params.toString()
    const newURL = queryString ? `${basePath}?${queryString}` : basePath

    // Use replace to avoid adding to history for every keystroke
    router.push(newURL, { scroll: false })
  }

  const handleSearch = () => {
    const trimmed = inputValue.trim()
    updateURL(trimmed, typeFilter, scopeFilter, statusFilter)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handlePublish = async (documentId: string) => {
    try {
      await publishDocument(documentId)
      addToast({
        title: 'Documento publicado',
        description: 'El documento ahora es visible públicamente',
        variant: 'success',
      })
      // Revalidar caché de SWR
      mutate()
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo publicar el documento',
        variant: 'destructive',
      })
    }
  }

  const handleArchive = async (documentId: string) => {
    try {
      await archiveDocument(documentId)
      addToast({
        title: 'Documento archivado',
        description: 'El documento ha sido archivado',
        variant: 'success',
      })
      // Revalidar caché de SWR
      mutate()
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo archivar el documento',
        variant: 'destructive',
      })
    }
  }

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos Legales
          </CardTitle>
          {canCreate && (
            <Button onClick={() => router.push(`${basePath}/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Documento
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  name="search"
                  type="search"
                  placeholder="Buscar documentos legales (presiona Enter o haz clic en Buscar)..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>
                Buscar
              </Button>
            </div>
            {/* Advanced Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtros Avanzados
            </Button>
          </div>

          {/* Semantic Search Indicator */}
          {isSemanticSearch && searchTerm && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
              <Sparkles className="h-4 w-4" />
              <span>
                Búsqueda inteligente con IA activada
                {searchExecutionTime && (
                  <span className="text-blue-500 ml-2">
                    ({searchExecutionTime}ms)
                  </span>
                )}
              </span>
            </div>
          )}

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type Filter */}
              <Select name="type-filter" value={typeFilter} onValueChange={(value) => updateURL(searchTerm, value, scopeFilter, statusFilter)}>
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="Tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="CONSTITUCION">Constitución</SelectItem>
                  <SelectItem value="TRATADO_INTERNACIONAL">Tratado Internacional</SelectItem>
                  <SelectItem value="LEY_ORGANICA">Ley Orgánica</SelectItem>
                  <SelectItem value="LEY_ORDINARIA">Ley Ordinaria</SelectItem>
                  <SelectItem value="DECRETO_LEY">Decreto Ley</SelectItem>
                  <SelectItem value="DECRETO">Decreto</SelectItem>
                  <SelectItem value="REGLAMENTO">Reglamento</SelectItem>
                  <SelectItem value="ORDENANZA">Ordenanza</SelectItem>
                  <SelectItem value="RESOLUCION">Resolución</SelectItem>
                  <SelectItem value="ACUERDO">Acuerdo</SelectItem>
                  <SelectItem value="CIRCULAR">Circular</SelectItem>
                  <SelectItem value="DIRECTIVA">Directiva</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select name="status-filter" value={statusFilter} onValueChange={(value) => updateURL(searchTerm, typeFilter, scopeFilter, value)}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="DRAFT">Borrador</SelectItem>
                  <SelectItem value="PUBLISHED">Publicado</SelectItem>
                  <SelectItem value="ARCHIVED">Archivado</SelectItem>
                </SelectContent>
              </Select>

              {/* Scope Filter */}
              <Select name="scope-filter" value={scopeFilter} onValueChange={(value) => updateURL(searchTerm, typeFilter, value, statusFilter)}>
                <SelectTrigger id="scope-filter">
                  <SelectValue placeholder="Ámbito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los ámbitos</SelectItem>
                  <SelectItem value="INTERNACIONAL">Internacional</SelectItem>
                  <SelectItem value="NACIONAL">Nacional</SelectItem>
                  <SelectItem value="REGIONAL">Regional</SelectItem>
                  <SelectItem value="MUNICIPAL">Municipal</SelectItem>
                  <SelectItem value="LOCAL">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <ComponentLoadingIndicator message="Cargando documentos" size="md" height="md" />
        ) : !hasSearched ? (
          <div className="text-center py-8">
            <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Realiza una búsqueda para ver resultados</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No se encontraron documentos</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ámbito</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  {showActions && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>{doc.documentNumber || '-'}</TableCell>
                    <TableCell>{translateDocumentType(doc.type)}</TableCell>
                    <TableCell>{translateDocumentScope(doc.scope)}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`${basePath}/${doc.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`${basePath}/${doc.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canPublish && doc.status === 'DRAFT' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePublish(doc.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {canArchive && doc.status === 'PUBLISHED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleArchive(doc.id)}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination - Only show for traditional search, not semantic search */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {isSemanticSearch ? (
                  <>Mostrando los {documents.length} resultados más relevantes</>
                ) : (
                  <>Mostrando {documents.length} de {total} documentos</>
                )}
              </p>
              {!isSemanticSearch && totalPages > 1 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-2 px-4">
                    <span className="text-sm">
                      Página {page} de {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
