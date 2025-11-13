import {
  DocumentType,
  DocumentStatus,
  DocumentScope,
  getHierarchyLevel,
} from './DocumentEnums';

/**
 * Document data for creation (without id, createdAt, updatedAt)
 */
export interface DocumentCreateData {
  title: string;
  documentNumber: string | null;
  type: DocumentType;
  hierarchyLevel: number;
  scope: DocumentScope;
  issuingEntity: string;
  isActive: boolean;
  status: DocumentStatus;
  summary: string | null;
  fullText: string | null;
  embedding: number[];
  keywords: string[];
  createdBy: string;
  updatedBy: string | null;
  publishedBy: string | null;
  publishedAt: Date | null;
}

/**
 * Document Entity - Represents a legal document in the system
 *
 * This entity follows Domain-Driven Design (DDD) principles:
 * - Rich domain model with business logic
 * - Value objects for complex properties
 * - Validation rules enforced at the domain level
 * - Independent of infrastructure concerns
 */
export class DocumentEntity {
  constructor(
    public readonly id: string,
    public title: string,
    public documentNumber: string | null,
    public type: DocumentType,
    public hierarchyLevel: number,
    public scope: DocumentScope,
    public issuingEntity: string,
    public isActive: boolean,
    public status: DocumentStatus,
    public summary: string | null,
    public fullText: string | null,
    public embedding: number[],
    public keywords: string[],
    public createdBy: string,
    public updatedBy: string | null,
    public publishedBy: string | null,
    public publishedAt: Date | null,
    public createdAt: Date,
    public updatedAt: Date,
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new document (not yet persisted)
   */
  static create(params: {
    title: string;
    documentNumber?: string;
    type: DocumentType;
    scope?: DocumentScope;
    issuingEntity: string;
    summary?: string;
    fullText?: string;
    keywords?: string[];
    createdBy: string;
  }): DocumentCreateData {
    const hierarchyLevel = getHierarchyLevel(params.type);

    return {
      title: params.title,
      documentNumber: params.documentNumber || null,
      type: params.type,
      hierarchyLevel,
      scope: params.scope || DocumentScope.NACIONAL,
      issuingEntity: params.issuingEntity,
      isActive: true,
      status: DocumentStatus.DRAFT,
      summary: params.summary || null,
      fullText: params.fullText || null,
      embedding: [],
      keywords: params.keywords || [],
      createdBy: params.createdBy,
      updatedBy: null,
      publishedBy: null,
      publishedAt: null,
    };
  }

  /**
   * Domain validation rules
   */
  private validate(): void {
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Document title is required');
    }

    if (this.title.length > 500) {
      throw new Error('Document title must not exceed 500 characters');
    }

    if (this.hierarchyLevel < 1 || this.hierarchyLevel > 13) {
      throw new Error('Hierarchy level must be between 1 and 13');
    }

    if (this.keywords.length > 50) {
      throw new Error('Document cannot have more than 50 keywords');
    }

    if (!this.createdBy) {
      throw new Error('Document must have a creator (createdBy)');
    }
  }

  /**
   * Business logic: Publish document
   */
  publish(publishedBy: string): void {
    if (this.status === DocumentStatus.PUBLISHED) {
      throw new Error('Document is already published');
    }

    if (!this.fullText || this.fullText.trim().length === 0) {
      throw new Error('Cannot publish document without full text');
    }

    this.status = DocumentStatus.PUBLISHED;
    this.publishedBy = publishedBy;
    this.publishedAt = new Date();
    this.updatedAt = new Date();
    this.updatedBy = publishedBy;
  }

  /**
   * Business logic: Archive document
   */
  archive(archivedBy: string): void {
    if (this.status === DocumentStatus.ARCHIVED) {
      throw new Error('Document is already archived');
    }

    this.status = DocumentStatus.ARCHIVED;
    this.isActive = false;
    this.updatedAt = new Date();
    this.updatedBy = archivedBy;
  }

  /**
   * Business logic: Update document content
   */
  updateContent(params: {
    title?: string;
    documentNumber?: string;
    issuingEntity?: string;
    summary?: string;
    fullText?: string;
    keywords?: string[];
    updatedBy: string;
  }): void {
    if (this.status === DocumentStatus.ARCHIVED) {
      throw new Error('Cannot update archived document');
    }

    if (params.title !== undefined) {
      this.title = params.title;
    }

    if (params.documentNumber !== undefined) {
      this.documentNumber = params.documentNumber;
    }

    if (params.issuingEntity !== undefined) {
      this.issuingEntity = params.issuingEntity;
    }

    if (params.summary !== undefined) {
      this.summary = params.summary;
    }

    if (params.fullText !== undefined) {
      this.fullText = params.fullText;
    }

    if (params.keywords !== undefined) {
      this.keywords = params.keywords;
    }

    this.updatedBy = params.updatedBy;
    this.updatedAt = new Date();

    this.validate();
  }

  /**
   * Business logic: Set embedding vector (after AI processing)
   */
  setEmbedding(embedding: number[]): void {
    if (embedding.length === 0) {
      throw new Error('Embedding vector cannot be empty');
    }

    this.embedding = embedding;
    this.updatedAt = new Date();
  }

  /**
   * Check if document is visible to public (published and active)
   */
  isPubliclyVisible(): boolean {
    return this.status === DocumentStatus.PUBLISHED && this.isActive;
  }

  /**
   * Check if document can be edited
   */
  canBeEdited(): boolean {
    return this.status !== DocumentStatus.ARCHIVED;
  }

  /**
   * Get document metadata (safe for public display)
   */
  getPublicMetadata(): {
    id: string;
    title: string;
    documentNumber: string | null;
    type: DocumentType;
    scope: DocumentScope;
    summary: string | null;
    keywords: string[];
    publishedAt: Date | null;
  } {
    return {
      id: this.id,
      title: this.title,
      documentNumber: this.documentNumber,
      type: this.type,
      scope: this.scope,
      summary: this.summary,
      keywords: this.keywords,
      publishedAt: this.publishedAt,
    };
  }
}
