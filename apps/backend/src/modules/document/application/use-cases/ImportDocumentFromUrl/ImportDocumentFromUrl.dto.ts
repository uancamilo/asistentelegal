import { IsString, IsNotEmpty, IsUrl, IsEnum, IsOptional } from 'class-validator';
import { DocumentType, DocumentScope } from '../../../domain/entities/DocumentEnums';

/**
 * DTO for importing a document from a URL
 */
export class ImportDocumentFromUrlDto {
  @IsUrl({}, { message: 'URL must be a valid URL' })
  @IsNotEmpty({ message: 'URL is required' })
  url!: string;

  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;

  @IsEnum(DocumentType, { message: 'Type must be a valid DocumentType' })
  @IsNotEmpty({ message: 'Document type is required' })
  type!: DocumentType;

  @IsString({ message: 'Issuing entity must be a string' })
  @IsNotEmpty({ message: 'Issuing entity is required' })
  issuingEntity!: string;

  @IsOptional()
  @IsString({ message: 'Document number must be a string' })
  documentNumber?: string;

  @IsOptional()
  @IsEnum(DocumentScope, { message: 'Scope must be a valid DocumentScope' })
  scope?: DocumentScope;

  @IsOptional()
  @IsString({ message: 'Summary must be a string' })
  summary?: string;
}

/**
 * Response DTO for import document from URL
 */
export interface ImportDocumentFromUrlResponseDto {
  id: string;
  title: string;
  type: DocumentType;
  status: string;
  processingStatus: string;
  embeddingStatus: string;
  sourceUrl: string;
  message: string;
}
