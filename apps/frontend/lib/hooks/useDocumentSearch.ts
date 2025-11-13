import useSWR from 'swr'
import { getDocuments, smartSearch } from '@/lib/api/documents'
import type { Document, SearchResult } from '@/lib/types'

interface UseDocumentSearchParams {
  searchTerm: string
  typeFilter: string
  scopeFilter: string
  statusFilter: string
  page: number
  enabled: boolean // Solo buscar cuando el usuario ha iniciado una búsqueda
}

interface SearchResponse {
  documents: Document[]
  total: number
  totalPages: number
  isSemanticSearch: boolean
  executionTime: number | null
}

// Fetcher function para SWR
const fetcher = async (key: any[]): Promise<SearchResponse> => {
  // SWR pasa el array completo como primer argumento
  // key = ['documents-search-v2', searchTerm, typeFilter, scopeFilter, statusFilter, page]
  const [_keyName, searchTerm, typeFilter, scopeFilter, statusFilter, page] = key

  // Validar que searchTerm no sea solo espacios en blanco
  const trimmedQuery = searchTerm?.trim() || ''

  // Búsqueda semántica/inteligente (solo si hay término de búsqueda)
  if (trimmedQuery.length > 0) {
    // Construir filtros seguros - solo agregar filtros válidos
    const searchFilters: any = { limit: 20 }

    // Solo agregar type si es un valor válido del enum
    if (typeFilter && typeFilter !== 'all') {
      const validTypes = ['CONSTITUCION', 'TRATADO_INTERNACIONAL', 'LEY_ORGANICA', 'LEY_ORDINARIA',
                         'DECRETO_LEY', 'DECRETO', 'REGLAMENTO', 'ORDENANZA', 'RESOLUCION',
                         'ACUERDO', 'CIRCULAR', 'DIRECTIVA', 'OTRO']
      if (validTypes.includes(typeFilter)) {
        searchFilters.type = typeFilter
      }
    }

    // Solo agregar scope si es un valor válido
    if (scopeFilter && scopeFilter !== 'all') {
      const validScopes = ['INTERNACIONAL', 'NACIONAL', 'REGIONAL', 'MUNICIPAL', 'LOCAL']
      if (validScopes.includes(scopeFilter)) {
        searchFilters.scope = scopeFilter
      }
    }

    const searchResponse = await smartSearch(trimmedQuery, searchFilters)

    const documentsFromSearch: Document[] = searchResponse.results.map((result: SearchResult) => ({
      ...result,
      publishedAt: result.publishedAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fullText: result.excerpt || null,
      isActive: true,
    }))

    return {
      documents: documentsFromSearch,
      total: searchResponse.total,
      totalPages: Math.ceil(searchResponse.total / 20),
      isSemanticSearch: true,
      executionTime: searchResponse.executionTime,
    }
  }

  // Búsqueda tradicional con filtros (sin término de búsqueda)
  const filters: any = {
    page,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }

  if (typeFilter !== 'all') filters.type = typeFilter
  if (statusFilter !== 'all') filters.status = statusFilter
  if (scopeFilter !== 'all') filters.scope = scopeFilter

  const response = await getDocuments(filters)

  return {
    documents: response.documents,
    total: response.total,
    totalPages: response.totalPages,
    isSemanticSearch: false,
    executionTime: null,
  }
}

export function useDocumentSearch({
  searchTerm,
  typeFilter,
  scopeFilter,
  statusFilter,
  page,
  enabled,
}: UseDocumentSearchParams) {
  // Crear una key única basada en los parámetros de búsqueda
  // Agregamos v2 para invalidar caché corrupto de versión anterior
  const swrKey = enabled
    ? ['documents-search-v2', searchTerm, typeFilter, scopeFilter, statusFilter, page]
    : null

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    fetcher,
    {
      // Configuración de caché inteligente
      revalidateOnFocus: false, // No re-buscar cuando la ventana recibe foco
      revalidateOnReconnect: false, // No re-buscar al reconectar internet
      dedupingInterval: 60000, // No duplicar requests en 60 segundos
      keepPreviousData: true, // Mantener datos anteriores mientras carga nuevos

      // Caché persistente durante 5 minutos
      // Después de 5 minutos, revalidará automáticamente
      revalidateIfStale: true,
      shouldRetryOnError: false, // No reintentar en errores
    }
  )

  return {
    documents: data?.documents || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 1,
    isSemanticSearch: data?.isSemanticSearch || false,
    executionTime: data?.executionTime || null,
    isLoading,
    error,
    mutate, // Función para revalidar manualmente si es necesario
  }
}
