import { DocumentFileCreateData } from '../entities/DocumentFile.entity';
import { DocumentFileEntity } from '../entities/DocumentFile.entity';
import { ProcessingStatus } from '../entities/DocumentEnums';

/**
 * DocumentFile Repository Interface
 *
 * Defines the contract for document file persistence operations.
 */

export interface IDocumentFileRepository {
  /**
   * Create a new document file
   */
  create(
    file: DocumentFileCreateData,
  ): Promise<DocumentFileEntity>;

  /**
   * Find file by ID
   */
  findById(id: string): Promise<DocumentFileEntity | null>;

  /**
   * Find all files for a document
   */
  findByDocumentId(documentId: string): Promise<DocumentFileEntity[]>;

  /**
   * Find main file for a document
   */
  findMainFileByDocumentId(documentId: string): Promise<DocumentFileEntity | null>;

  /**
   * Find files by processing status
   */
  findByProcessingStatus(status: ProcessingStatus): Promise<DocumentFileEntity[]>;

  /**
   * Update file
   */
  update(id: string, file: Partial<DocumentFileEntity>): Promise<DocumentFileEntity>;

  /**
   * Delete file
   */
  delete(id: string): Promise<void>;

  /**
   * Check if file exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Get total storage used (in bytes)
   */
  getTotalStorageUsed(): Promise<number>;
}
