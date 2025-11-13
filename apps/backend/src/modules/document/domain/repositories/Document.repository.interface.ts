import { DocumentEntity, DocumentCreateData } from '../entities/Document.entity';
import { DocumentType, DocumentStatus, DocumentScope } from '../entities/DocumentEnums';

/**
 * Document Repository Interface - Port in Hexagonal Architecture
 *
 * Defines the contract for document persistence operations.
 * Implementations must be provided by the infrastructure layer.
 *
 * This interface follows the Repository pattern and enables:
 * - Clean separation between domain and infrastructure
 * - Easy testing with mock implementations
 * - Flexibility to switch persistence technologies
 */

export interface FindDocumentsOptions {
  // Filtering
  type?: DocumentType;
  status?: DocumentStatus;
  scope?: DocumentScope;
  isActive?: boolean;
  createdBy?: string;
  searchText?: string; // Search in title, summary, keywords

  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'hierarchyLevel' | 'title';
  sortOrder?: 'asc' | 'desc';

  // Relations
  includeFiles?: boolean;
  includeRelations?: boolean;
  includeVersions?: boolean;
}

export interface FindDocumentsResult {
  documents: DocumentEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VectorSearchOptions {
  embedding: number[];
  limit?: number;
  minSimilarity?: number;
  filters?: {
    type?: DocumentType;
    status?: DocumentStatus;
    scope?: DocumentScope;
  };
}

/**
 * Options for similarity search (enhanced vector search)
 */
export interface SimilaritySearchOptions {
  limit?: number;
  similarityThreshold?: number;
  type?: DocumentType;
  scope?: DocumentScope;
  onlyActive?: boolean;
  onlyPublished?: boolean;
}

/**
 * Options for keyword search
 */
export interface KeywordSearchOptions {
  limit?: number;
  type?: DocumentType;
  scope?: DocumentScope;
  onlyActive?: boolean;
  onlyPublished?: boolean;
}

export interface IDocumentRepository {
  /**
   * Create a new document
   */
  create(document: DocumentCreateData): Promise<DocumentEntity>;

  /**
   * Find document by ID
   */
  findById(id: string): Promise<DocumentEntity | null>;

  /**
   * Find document by document number
   */
  findByDocumentNumber(documentNumber: string): Promise<DocumentEntity | null>;

  /**
   * Find multiple documents with filtering, pagination, and sorting
   */
  findMany(options: FindDocumentsOptions): Promise<FindDocumentsResult>;

  /**
   * Search documents by vector similarity (semantic search)
   */
  searchByVector(options: VectorSearchOptions): Promise<DocumentEntity[]>;

  /**
   * Search documents by similarity with enhanced options
   * Returns documents with similarity scores
   */
  searchBySimilarity(
    embedding: number[],
    options: SimilaritySearchOptions,
  ): Promise<Array<DocumentEntity & { similarity: number }>>;

  /**
   * Search documents by keywords (traditional text search)
   * Searches in title, summary, fullText, and keywords
   */
  searchByKeywords(
    query: string,
    options: KeywordSearchOptions,
  ): Promise<Array<DocumentEntity & { keywordScore: number }>>;

  /**
   * Update an existing document
   */
  update(id: string, document: Partial<DocumentEntity>): Promise<DocumentEntity>;

  /**
   * Delete a document (soft delete - sets isActive to false)
   */
  softDelete(id: string): Promise<void>;

  /**
   * Hard delete a document (permanent removal)
   */
  hardDelete(id: string): Promise<void>;

  /**
   * Count documents matching criteria
   */
  count(filters?: {
    type?: DocumentType;
    status?: DocumentStatus;
    scope?: DocumentScope;
    isActive?: boolean;
  }): Promise<number>;

  /**
   * Check if a document exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Find published documents (for public access)
   */
  findPublished(options: Omit<FindDocumentsOptions, 'status'>): Promise<FindDocumentsResult>;

  /**
   * Get document statistics
   */
  getStatistics(): Promise<{
    totalDocuments: number;
    publishedDocuments: number;
    draftDocuments: number;
    archivedDocuments: number;
    byType: Record<DocumentType, number>;
    byScope: Record<DocumentScope, number>;
  }>;
}
