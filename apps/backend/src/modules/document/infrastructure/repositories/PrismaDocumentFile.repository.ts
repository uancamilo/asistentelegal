import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { IDocumentFileRepository } from '../../domain/repositories/DocumentFile.repository.interface';
import { DocumentFileEntity, DocumentFileCreateData } from '../../domain/entities/DocumentFile.entity';
import { ProcessingStatus } from '../../domain/entities/DocumentEnums';

/**
 * Prisma implementation of DocumentFile Repository
 */
@Injectable()
export class PrismaDocumentFileRepository implements IDocumentFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    file: DocumentFileCreateData,
  ): Promise<DocumentFileEntity> {
    const created = await this.prisma.documentFile.create({
      data: {
        documentId: file.documentId,
        fileName: file.originalName,
        fileSize: file.sizeBytes,
        mimeType: file.mimeType,
        storagePath: file.filePath,
        storageUrl: file.fileUrl,
        fileHash: file.fileHash,
        pageCount: file.pageCount,
        processingStatus: file.processingStatus,
        extractedText: file.extractedText,
        processingError: file.processingError,
        uploadedBy: file.uploadedBy,
      },
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<DocumentFileEntity | null> {
    const file = await this.prisma.documentFile.findUnique({
      where: { id },
    });

    return file ? this.toDomain(file) : null;
  }

  async findByDocumentId(documentId: string): Promise<DocumentFileEntity[]> {
    const files = await this.prisma.documentFile.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    return files.map((file: any) => this.toDomain(file));
  }

  async findMainFileByDocumentId(documentId: string): Promise<DocumentFileEntity | null> {
    const file = await this.prisma.documentFile.findFirst({
      where: {
        documentId,
      },
    });

    return file ? this.toDomain(file) : null;
  }

  async findByProcessingStatus(status: ProcessingStatus): Promise<DocumentFileEntity[]> {
    const files = await this.prisma.documentFile.findMany({
      where: { processingStatus: status },
      orderBy: { createdAt: 'asc' },
    });

    return files.map((file: any) => this.toDomain(file));
  }

  async update(id: string, data: Partial<DocumentFileEntity>): Promise<DocumentFileEntity> {
    const updated = await this.prisma.documentFile.update({
      where: { id },
      data: {
        ...(data.fileName !== undefined && { fileName: data.fileName }),
        ...(data.fileUrl !== undefined && { storageUrl: data.fileUrl }),
        ...(data.processingStatus !== undefined && {
          processingStatus: data.processingStatus,
        }),
        ...(data.processingError !== undefined && { processingError: data.processingError }),
        ...(data.extractedText !== undefined && { extractedText: data.extractedText }),
        ...(data.pageCount !== undefined && { pageCount: data.pageCount }),
        updatedAt: new Date(),
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.documentFile.delete({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.documentFile.count({
      where: { id },
    });
    return count > 0;
  }

  async getTotalStorageUsed(): Promise<number> {
    const result = await this.prisma.documentFile.aggregate({
      _sum: {
        fileSize: true,
      },
    });

    return result._sum.fileSize || 0;
  }

  /**
   * Map Prisma model to Domain Entity
   */
  private toDomain(prismaFile: any): DocumentFileEntity {
    return new DocumentFileEntity(
      prismaFile.id,
      prismaFile.documentId,
      prismaFile.fileName,
      prismaFile.fileName, // originalName = fileName in Prisma
      prismaFile.storagePath,
      prismaFile.storageUrl,
      prismaFile.mimeType,
      prismaFile.fileSize,
      prismaFile.fileHash,
      prismaFile.processingStatus as ProcessingStatus,
      prismaFile.processingError,
      prismaFile.extractedText,
      prismaFile.pageCount,
      true, // isMainFile - default to true (not in schema)
      prismaFile.uploadedBy,
      prismaFile.createdAt,
      prismaFile.updatedAt,
    );
  }
}
