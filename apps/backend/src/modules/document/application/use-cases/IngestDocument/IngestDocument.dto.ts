import { IsNotEmpty, IsUrl } from 'class-validator';
import { DocumentType, DocumentScope } from '../../../domain/entities/DocumentEnums';

/**
 * Request DTO for automatic document ingestion
 * Only requires the URL - metadata is auto-detected from PDF content
 */
export class IngestDocumentDto {
  @IsUrl({}, { message: 'URL must be a valid URL' })
  @IsNotEmpty({ message: 'URL is required' })
  url!: string;
}

/**
 * Detected document metadata from PDF content analysis
 */
export interface DetectedDocumentMetadata {
  /** Detected document title */
  title: string;

  /** Document number (e.g., "Ley 123-2024", "RO-456") */
  documentNumber: string | null;

  /** Detected document type */
  documentType: DocumentType;

  /** Document scope (nacional, regional, etc.) */
  scope: DocumentScope;

  /** Issuing entity (e.g., "Asamblea Nacional") */
  issuingEntity: string;

  /** Publication/effective date if detected */
  date: string | null;

  /** Auto-generated summary */
  summary: string;

  /** Extracted full text content */
  content: string;

  /** Content converted to structured Markdown */
  contentMarkdown: string;

  /** Number of chunks created */
  chunksCount: number;

  /** Auto-detected keywords */
  keywords: string[];

  /** Confidence score for metadata detection (0-1) */
  confidence: number;
}

/**
 * Response DTO for document ingestion
 * Supports single or multiple detected documents from a PDF
 */
export interface IngestDocumentResponseDto {
  /** Whether ingestion was successful */
  success: boolean;

  /** Source URL processed */
  sourceUrl: string;

  /** Total pages in PDF */
  totalPages: number;

  /** Total characters extracted */
  totalCharacters: number;

  /** Whether multiple documents/norms were detected */
  multipleDocumentsDetected: boolean;

  /** Detected documents (1 or more) */
  detectedDocuments: DetectedDocumentMetadata[];

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Any warnings or notes */
  warnings: string[];
}
