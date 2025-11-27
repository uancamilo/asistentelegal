import {
  IsBoolean,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateIf,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentScope } from '../../domain/entities/DocumentEnums';

/**
 * DTO for reviewing a document
 *
 * Used by ADMIN/EDITOR to approve or reject a document after processing.
 * Allows metadata modifications before approval.
 */
export class ReviewDocumentDto {
  @ApiPropertyOptional({
    description: 'Updated document title',
    example: 'Ley 1234 de 2024 - Código de Comercio',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated document scope',
    enum: DocumentScope,
    example: DocumentScope.NACIONAL,
  })
  @IsOptional()
  @IsEnum(DocumentScope)
  scope?: DocumentScope;

  @ApiPropertyOptional({
    description: 'Updated document summary',
    example: 'Esta ley regula las actividades comerciales en el territorio nacional.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string;

  @ApiPropertyOptional({
    description: 'Updated document tags/keywords',
    example: ['comercio', 'empresas', 'contratos'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Whether to approve (true) or reject (false) the document',
    example: true,
  })
  @IsBoolean()
  approved!: boolean;

  @ApiPropertyOptional({
    description: 'Reason for rejection (required if approved=false)',
    example: 'El texto extraído está incompleto. Faltan los artículos 15 al 20.',
    maxLength: 2000,
  })
  @ValidateIf((o) => o.approved === false)
  @IsNotEmpty({ message: 'rejectionReason is required when approved is false' })
  @IsString()
  @MaxLength(2000)
  rejectionReason?: string;
}

/**
 * Response DTO for review action
 */
export interface ReviewDocumentResponseDto {
  id: string;
  title: string;
  status: string;
  reviewedBy: string;
  reviewedAt: Date;
  rejectionReason?: string | null;
  message: string;
}
