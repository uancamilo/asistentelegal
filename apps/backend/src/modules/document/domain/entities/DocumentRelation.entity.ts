import { DocumentRelationType } from './DocumentEnums';
/**
 * DocumentRelation data for creation (without id, createdAt, updatedAt)
 */
export interface DocumentRelationCreateData {
  fromDocumentId: string;
  toDocumentId: string;
  relationType: DocumentRelationType;
  description: string | null;
  articleReferences: string[];
  effectiveDate: Date | null;
  createdBy: string;
}


/**
 * DocumentRelation Entity - Represents a relationship between two documents
 *
 * Examples:
 * - Law A DEROGA (repeals) Law B
 * - Decree X MODIFICA (modifies) Law Y
 * - Regulation Z REGLAMENTA (regulates) Law W
 *
 * This entity helps track the legal hierarchy and evolution of norms.
 */
export class DocumentRelationEntity {
  constructor(
    public readonly id: string,
    public readonly fromDocumentId: string,
    public readonly toDocumentId: string,
    public relationType: DocumentRelationType,
    public description: string | null,
    public articleReferences: string[],
    public effectiveDate: Date | null,
    public createdBy: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new document relation
   */
  static create(params: {
    fromDocumentId: string;
    toDocumentId: string;
    relationType: DocumentRelationType;
    description?: string;
    articleReferences?: string[];
    effectiveDate?: Date;
    createdBy: string;
  }): DocumentRelationCreateData {
    return {
      fromDocumentId: params.fromDocumentId,
      toDocumentId: params.toDocumentId,
      relationType: params.relationType,
      description: params.description || null,
      articleReferences: params.articleReferences || [],
      effectiveDate: params.effectiveDate || null,
      createdBy: params.createdBy,
    } as Omit<DocumentRelationEntity, 'id' | 'createdAt' | 'updatedAt'>;
  }

  /**
   * Domain validation rules
   */
  private validate(): void {
    if (!this.fromDocumentId) {
      throw new Error('Source document (fromDocumentId) is required');
    }

    if (!this.toDocumentId) {
      throw new Error('Target document (toDocumentId) is required');
    }

    if (this.fromDocumentId === this.toDocumentId) {
      throw new Error('A document cannot have a relation with itself');
    }

    if (!this.relationType) {
      throw new Error('Relation type is required');
    }

    if (!this.createdBy) {
      throw new Error('Relation must have a creator (createdBy)');
    }

    if (this.articleReferences.length > 100) {
      throw new Error('Cannot have more than 100 article references');
    }

    if (this.description && this.description.length > 1000) {
      throw new Error('Description must not exceed 1000 characters');
    }
  }

  /**
   * Business logic: Update relation details
   */
  updateDetails(params: {
    description?: string;
    articleReferences?: string[];
    effectiveDate?: Date;
  }): void {
    if (params.description !== undefined) {
      this.description = params.description;
    }

    if (params.articleReferences !== undefined) {
      this.articleReferences = params.articleReferences;
    }

    if (params.effectiveDate !== undefined) {
      this.effectiveDate = params.effectiveDate;
    }

    this.updatedAt = new Date();
    this.validate();
  }

  /**
   * Check if relation is effective (has passed effective date)
   */
  isEffective(): boolean {
    if (!this.effectiveDate) {
      return true; // No effective date means immediately effective
    }

    return this.effectiveDate <= new Date();
  }

  /**
   * Get human-readable relation description
   */
  getRelationDescription(): string {
    const typeDescriptions: Record<DocumentRelationType, string> = {
      [DocumentRelationType.DEROGA]: 'deroga',
      [DocumentRelationType.MODIFICA]: 'modifica',
      [DocumentRelationType.COMPLEMENTA]: 'complementa',
      [DocumentRelationType.SUSTITUYE]: 'sustituye',
      [DocumentRelationType.ACLARA]: 'aclara',
      [DocumentRelationType.REGLAMENTA]: 'reglamenta',
    };

    return typeDescriptions[this.relationType];
  }

  /**
   * Check if this is a repeal relation (strongest type)
   */
  isRepeal(): boolean {
    return this.relationType === DocumentRelationType.DEROGA;
  }

  /**
   * Check if this is a modification relation
   */
  isModification(): boolean {
    return this.relationType === DocumentRelationType.MODIFICA;
  }
}
