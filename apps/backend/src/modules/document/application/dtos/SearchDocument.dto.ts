import { IsString, IsOptional, IsNumber, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for semantic search request
 */
export class SearchDocumentsRequestDto {
  @IsString()
  @MinLength(3, { message: 'Search query must be at least 3 characters' })
  query!: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minScore?: number;
}

/**
 * DTO for a single search result
 */
export interface SearchResultDto {
  documentId: string;
  title: string;
  documentNumber: string | null;
  type: string;
  score: number;
  snippet: string;
  chunkIndex: number;
}

/**
 * DTO for search response
 */
export interface SearchDocumentsResponseDto {
  results: SearchResultDto[];
  total: number;
  query: string;
  executionTimeMs: number;
}
