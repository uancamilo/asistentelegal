import { IsString, MinLength, MaxLength, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Request DTO for asking the legal assistant a question
 */
export class AskAssistantRequestDto {
  @IsString()
  @MinLength(10, { message: 'La pregunta debe tener al menos 10 caracteres' })
  @MaxLength(1000, { message: 'La pregunta no puede exceder 1000 caracteres' })
  question!: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(10)
  maxSources?: number;
}

/**
 * Source reference from a document chunk used in the answer
 */
export interface SourceReferenceDto {
  documentId: string;
  title: string;
  documentNumber: string | null;
  chunkId: string;
  chunkIndex: number;
  score: number;
  snippet: string;
}

/**
 * Response DTO for the legal assistant answer
 */
export interface AskAssistantResponseDto {
  answer: string;
  sources: SourceReferenceDto[];
  query: string;
  tokensUsed?: number;
  executionTimeMs: number;
}
