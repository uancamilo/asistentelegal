import apiClient from './client';
import type {
  Document,
  DocumentListResponse,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  FilterDocumentsRequest,
  DocumentStatistics,
  DocumentFile,
  SemanticSearchRequest,
  HybridSearchRequest,
  SearchResponse,
} from '../types';

/**
 * Document API Service
 * Handles all API calls related to document management
 */

/**
 * Get all documents with optional filters
 */
export const getDocuments = async (
  filters?: FilterDocumentsRequest
): Promise<DocumentListResponse> => {
  const params = new URLSearchParams();

  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.scope) params.append('scope', filters.scope);
  if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
  if (filters?.searchText) params.append('searchText', filters.searchText);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.sortBy) params.append('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

  const response = await apiClient.get(`/documents?${params.toString()}`);
  return response.data;
};

/**
 * Get a single document by ID
 */
export const getDocumentById = async (id: string): Promise<Document> => {
  const response = await apiClient.get(`/documents/${id}`);
  return response.data;
};

/**
 * Create a new document
 */
export const createDocument = async (data: CreateDocumentRequest): Promise<Document> => {
  const response = await apiClient.post('/documents', data);
  return response.data;
};

/**
 * Update an existing document
 */
export const updateDocument = async (
  id: string,
  data: UpdateDocumentRequest
): Promise<Document> => {
  const response = await apiClient.patch(`/documents/${id}`, data);
  return response.data;
};

/**
 * Delete a document
 */
export const deleteDocument = async (id: string): Promise<void> => {
  await apiClient.delete(`/documents/${id}`);
};

/**
 * Publish a document (change status from DRAFT to PUBLISHED)
 */
export const publishDocument = async (id: string): Promise<Document> => {
  const response = await apiClient.post(`/documents/${id}/publish`);
  return response.data;
};

/**
 * Archive a document (change status to ARCHIVED)
 */
export const archiveDocument = async (id: string): Promise<Document> => {
  const response = await apiClient.patch(`/documents/${id}`, {
    status: 'ARCHIVED',
  });
  return response.data;
};

/**
 * Upload a file for a document
 */
export const uploadDocumentFile = async (
  documentId: string,
  file: File,
  onUploadProgress?: (progressEvent: any) => void
): Promise<DocumentFile> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(`/documents/${documentId}/files`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return response.data;
};

/**
 * Get all files for a document
 */
export const getDocumentFiles = async (documentId: string): Promise<DocumentFile[]> => {
  const response = await apiClient.get(`/documents/${documentId}/files`);
  return response.data;
};

/**
 * Delete a document file
 */
export const deleteDocumentFile = async (
  documentId: string,
  fileId: string
): Promise<void> => {
  await apiClient.delete(`/documents/${documentId}/files/${fileId}`);
};

/**
 * Get document statistics (for dashboards)
 */
export const getDocumentStatistics = async (): Promise<DocumentStatistics> => {
  const response = await apiClient.get('/documents/statistics');
  return response.data;
};

/**
 * Semantic search using OpenAI embeddings
 * Pure vector similarity search
 */
export const semanticSearch = async (
  params: SemanticSearchRequest
): Promise<SearchResponse> => {
  const response = await apiClient.post('/search/semantic', params);
  return response.data;
};

/**
 * Hybrid search combining semantic (OpenAI) + keyword search
 * Recommended for best results - combines AI understanding with exact matching
 */
export const hybridSearch = async (
  params: HybridSearchRequest
): Promise<SearchResponse> => {
  const response = await apiClient.post('/search/hybrid', params);
  return response.data;
};

/**
 * Smart search function that chooses the best search method
 * - If query text provided: uses hybrid search (semantic + keyword)
 * - If only filters: uses traditional document listing
 */
export const smartSearch = async (
  query: string,
  filters?: {
    type?: string;
    scope?: string;
    limit?: number;
  }
): Promise<SearchResponse> => {
  const params: HybridSearchRequest = {
    query,
    limit: filters?.limit || 20,
    semanticWeight: 0.7, // 70% semantic, 30% keyword
    includeKeywordSearch: true,
  };

  if (filters?.type && filters.type !== 'all') {
    params.type = filters.type as any;
  }
  if (filters?.scope && filters.scope !== 'all') {
    params.scope = filters.scope as any;
  }

  return hybridSearch(params);
};
