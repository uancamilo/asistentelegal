import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType, DocumentScope, DocumentStatus } from '../../../document/domain/entities/DocumentEnums';
import { SanitizeText } from '../../../../shared/validators/text-sanitizer';

/**
 * DTO for semantic search request
 */
export class SemanticSearchDto {
  @IsString()
  @SanitizeText(1000)
  query!: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  similarityThreshold?: number = 0.7;

  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  @IsEnum(DocumentScope)
  scope?: DocumentScope;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  onlyActive?: boolean = true;
}

/**
 * DTO for hybrid search (semantic + keyword)
 */
export class HybridSearchDto extends SemanticSearchDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  semanticWeight?: number = 0.7;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeKeywordSearch?: boolean = true;
}

/**
 * Search result item
 */
export interface SearchResultDto {
  id: string;
  title: string;
  documentNumber: string | null;
  type: DocumentType;
  hierarchyLevel: number;
  scope: DocumentScope;
  issuingEntity: string;
  status: DocumentStatus;
  summary: string | null;
  keywords: string[];
  publishedAt: Date | null;

  // Search-specific fields
  similarity: number; // Cosine similarity score (0-1)
  relevanceScore: number; // Combined score for hybrid search
  matchType: 'semantic' | 'keyword' | 'hybrid';
  excerpt?: string; // Relevant excerpt from fullText
}

/**
 * Search response with results and metadata
 */
export interface SearchResponseDto {
  results: SearchResultDto[];
  total: number;
  query: string;
  executionTime: number; // milliseconds
  searchType: 'semantic' | 'hybrid';
  searchQueryId?: string; // For analytics tracking
}

/**
 * DTO for recording a click on a search result
 */
export class RecordClickDto {
  @IsString()
  searchQueryId!: string;

  @IsString()
  documentId!: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  clickPosition!: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  relevanceScore?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  timeToClickMs?: number;
}
