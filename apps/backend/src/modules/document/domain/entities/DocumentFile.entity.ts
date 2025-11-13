import { ProcessingStatus } from './DocumentEnums';
/**
 * DocumentFile data for creation (without id, createdAt, updatedAt)
 */
export interface DocumentFileCreateData {
  documentId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  fileHash: string;
  processingStatus: ProcessingStatus;
  processingError: string | null;
  extractedText: string | null;
  pageCount: number | null;
  isMainFile: boolean;
  uploadedBy: string;
}


/**
 * DocumentFile Entity - Represents a file attached to a document
 *
 * Handles:
 * - PDF file storage and metadata
 * - Processing status (OCR, text extraction)
 * - File integrity verification (hash)
 * - Multiple files per document (versions, annexes)
 */
export class DocumentFileEntity {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public fileName: string,
    public originalName: string,
    public filePath: string,
    public fileUrl: string | null,
    public mimeType: string,
    public sizeBytes: number,
    public fileHash: string,
    public processingStatus: ProcessingStatus,
    public processingError: string | null,
    public extractedText: string | null,
    public pageCount: number | null,
    public isMainFile: boolean,
    public uploadedBy: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new document file
   */
  static create(params: {
    documentId: string;
    fileName: string;
    originalName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
    fileHash: string;
    uploadedBy: string;
    isMainFile?: boolean;
  }): DocumentFileCreateData {
    return {
      documentId: params.documentId,
      fileName: params.fileName,
      originalName: params.originalName,
      filePath: params.filePath,
      fileUrl: null,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      fileHash: params.fileHash,
      processingStatus: ProcessingStatus.PENDING,
      processingError: null,
      extractedText: null,
      pageCount: null,
      isMainFile: params.isMainFile || true,
      uploadedBy: params.uploadedBy,
    } as Omit<DocumentFileEntity, 'id' | 'createdAt' | 'updatedAt'>;
  }

  /**
   * Domain validation rules
   */
  private validate(): void {
    if (!this.documentId) {
      throw new Error('DocumentFile must be associated with a document');
    }

    if (!this.fileName || this.fileName.trim().length === 0) {
      throw new Error('File name is required');
    }

    if (!this.mimeType || this.mimeType.trim().length === 0) {
      throw new Error('MIME type is required');
    }

    if (this.sizeBytes <= 0) {
      throw new Error('File size must be greater than 0');
    }

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
    if (this.sizeBytes > MAX_FILE_SIZE) {
      throw new Error('File size exceeds maximum allowed (100 MB)');
    }

    if (!this.fileHash) {
      throw new Error('File hash is required for integrity verification');
    }

    if (!this.uploadedBy) {
      throw new Error('File must have an uploader (uploadedBy)');
    }
  }

  /**
   * Business logic: Mark file as processing
   */
  startProcessing(): void {
    if (this.processingStatus === ProcessingStatus.PROCESSING) {
      throw new Error('File is already being processed');
    }

    if (this.processingStatus === ProcessingStatus.COMPLETED) {
      throw new Error('File has already been processed');
    }

    this.processingStatus = ProcessingStatus.PROCESSING;
    this.processingError = null;
    this.updatedAt = new Date();
  }

  /**
   * Business logic: Mark file processing as completed
   */
  completeProcessing(extractedText: string, pageCount: number): void {
    if (this.processingStatus !== ProcessingStatus.PROCESSING) {
      throw new Error('File is not currently being processed');
    }

    this.processingStatus = ProcessingStatus.COMPLETED;
    this.extractedText = extractedText;
    this.pageCount = pageCount;
    this.processingError = null;
    this.updatedAt = new Date();
  }

  /**
   * Business logic: Mark file processing as failed
   */
  failProcessing(error: string): void {
    if (this.processingStatus === ProcessingStatus.COMPLETED) {
      throw new Error('Cannot fail a completed file processing');
    }

    this.processingStatus = ProcessingStatus.FAILED;
    this.processingError = error;
    this.updatedAt = new Date();
  }

  /**
   * Business logic: Set public URL for file
   */
  setPublicUrl(url: string): void {
    if (!url || url.trim().length === 0) {
      throw new Error('File URL cannot be empty');
    }

    this.fileUrl = url;
    this.updatedAt = new Date();
  }

  /**
   * Check if file processing is complete
   */
  isProcessed(): boolean {
    return this.processingStatus === ProcessingStatus.COMPLETED;
  }

  /**
   * Check if file processing failed
   */
  hasFailed(): boolean {
    return this.processingStatus === ProcessingStatus.FAILED;
  }

  /**
   * Check if file is a PDF
   */
  isPDF(): boolean {
    return this.mimeType === 'application/pdf';
  }

  /**
   * Get file size in MB
   */
  getSizeInMB(): number {
    return this.sizeBytes / (1024 * 1024);
  }
}
