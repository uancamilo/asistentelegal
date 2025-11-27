import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsNumber, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType, DocumentStatus, DocumentScope } from '../../domain/entities/DocumentEnums';
import { SanitizeText } from '../../../../shared/validators/text-sanitizer';

/**
 * DTO for creating a new document
 *
 * SECURITY FIX (P2.4): All text fields sanitized to prevent Stored XSS
 */
export class CreateDocumentDto {
  @IsString()
  @MaxLength(500)
  @SanitizeText(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @SanitizeText(100)
  documentNumber?: string;

  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsOptional()
  @IsEnum(DocumentScope)
  scope?: DocumentScope;

  @IsString()
  @MaxLength(200)
  @SanitizeText(200)
  issuingEntity!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @SanitizeText() // Uses sanitizeLongText for long content
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000000, { message: 'fullText must not exceed 1MB (1,000,000 characters). For larger documents, consider splitting or using chunking.' })
  @SanitizeText() // Uses sanitizeLongText for long content
  fullText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

/**
 * DTO for updating an existing document
 *
 * SECURITY FIX (P2.4): All text fields sanitized to prevent Stored XSS
 */
export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @SanitizeText(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @SanitizeText(100)
  documentNumber?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  @IsEnum(DocumentScope)
  scope?: DocumentScope;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @SanitizeText(200)
  issuingEntity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @SanitizeText() // Uses sanitizeLongText for long content
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000000, { message: 'fullText must not exceed 1MB (1,000,000 characters). For larger documents, consider splitting or using chunking.' })
  @SanitizeText() // Uses sanitizeLongText for long content
  fullText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true})
  keywords?: string[];

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for filtering documents
 */
export class FilterDocumentsDto {
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsEnum(DocumentScope)
  scope?: DocumentScope;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'hierarchyLevel' | 'title';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

/**
 * DTO for document response
 */
export interface DocumentResponseDto {
  id: string;
  title: string;
  documentNumber: string | null;
  type: DocumentType;
  hierarchyLevel: number;
  scope: DocumentScope;
  issuingEntity: string;
  isActive: boolean;
  status: DocumentStatus;
  summary: string | null;
  keywords: string[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Conditionally included based on user permissions
  fullText?: string | null;
  createdBy?: string;
  updatedBy?: string | null;
  publishedBy?: string | null;

  // Processing and review fields (editors only)
  processingStatus?: string;
  embeddingStatus?: string;
  embeddingError?: string | null;
  sourceUrl?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  rejectionReason?: string | null;

  // Chunk information (for semantic search readiness)
  chunksCount?: number;
}

/**
 * DTO for paginated document list response
 */
export interface DocumentListResponseDto {
  documents: DocumentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * DTO for document statistics
 */
export interface DocumentStatisticsDto {
  totalDocuments: number;
  publishedDocuments: number;
  draftDocuments: number;
  archivedDocuments: number;
  byType: Record<DocumentType, number>;
  byScope: Record<DocumentScope, number>;
}
