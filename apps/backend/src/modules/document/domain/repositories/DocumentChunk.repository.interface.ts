/**
 * Document Chunk Repository Interface - Port in Hexagonal Architecture
 *
 * Defines the contract for document chunk persistence operations.
 * Chunks are used for granular embeddings and semantic search.
 */

export interface DocumentChunkData {
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding?: number[];
}

export interface DocumentChunkEntity {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChunkSearchResult {
  chunk: DocumentChunkEntity;
  documentId: string;
  similarity: number;
}

export interface IDocumentChunkRepository {
  /**
   * Create multiple chunks for a document
   * Replaces any existing chunks for that document
   */
  createChunks(
    documentId: string,
    chunks: Array<{ chunkIndex: number; content: string; embedding: number[] }>,
  ): Promise<DocumentChunkEntity[]>;

  /**
   * Delete all chunks for a document
   */
  deleteChunks(documentId: string): Promise<number>;

  /**
   * Find all chunks for a document, ordered by chunkIndex
   */
  findByDocumentId(documentId: string): Promise<DocumentChunkEntity[]>;

  /**
   * Count chunks for a document
   */
  countByDocumentId(documentId: string): Promise<number>;

  /**
   * Search chunks by vector similarity (semantic search)
   * Returns chunks with their similarity scores
   */
  searchByVector(
    embedding: number[],
    options?: {
      limit?: number;
      minSimilarity?: number;
      documentIds?: string[];
    },
  ): Promise<ChunkSearchResult[]>;

  /**
   * Get a specific chunk by document ID and index
   */
  findByDocumentIdAndIndex(
    documentId: string,
    chunkIndex: number,
  ): Promise<DocumentChunkEntity | null>;

  /**
   * Check if a document has chunks
   */
  hasChunks(documentId: string): Promise<boolean>;

  /**
   * Update embedding for a specific chunk
   */
  updateEmbedding(chunkId: string, embedding: number[]): Promise<void>;

  /**
   * Search chunks by vector similarity, filtering only PUBLISHED documents
   * Returns chunks with their similarity scores and document info
   */
  searchPublishedByVector(
    embedding: number[],
    options?: {
      limit?: number;
      minSimilarity?: number;
    },
  ): Promise<Array<ChunkSearchResult & { documentTitle: string; documentNumber: string | null; documentType: string }>>;
}
