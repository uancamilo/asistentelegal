/**
 * Enums for Document Management System
 *
 * These enums match the Prisma schema and define the possible values
 * for document types, statuses, relations, scopes, and processing states.
 */

/**
 * Document Type - Defines the hierarchical level of legal documents
 *
 * Hierarchy levels (1-13):
 * 1. CONSTITUCION - Highest authority
 * 2. TRATADO_INTERNACIONAL - International treaties
 * 3. LEY_ORGANICA - Organic laws
 * 4. LEY_ORDINARIA - Ordinary laws
 * 5. DECRETO_LEY - Law decrees
 * 6. DECRETO - Decrees
 * 7. REGLAMENTO - Regulations
 * 8. ORDENANZA - Ordinances
 * 9. RESOLUCION - Resolutions
 * 10. ACUERDO - Agreements
 * 11. CIRCULAR - Circulars
 * 12. DIRECTIVA - Directives
 * 13. OTRO - Other documents
 */
export enum DocumentType {
  CONSTITUCION = 'CONSTITUCION',
  TRATADO_INTERNACIONAL = 'TRATADO_INTERNACIONAL',
  LEY_ORGANICA = 'LEY_ORGANICA',
  LEY_ORDINARIA = 'LEY_ORDINARIA',
  DECRETO_LEY = 'DECRETO_LEY',
  DECRETO = 'DECRETO',
  REGLAMENTO = 'REGLAMENTO',
  ORDENANZA = 'ORDENANZA',
  RESOLUCION = 'RESOLUCION',
  ACUERDO = 'ACUERDO',
  CIRCULAR = 'CIRCULAR',
  DIRECTIVA = 'DIRECTIVA',
  OTRO = 'OTRO',
}

/**
 * Document Status - Current state in the publication workflow
 */
export enum DocumentStatus {
  DRAFT = 'DRAFT',           // Being created/edited
  IN_REVIEW = 'IN_REVIEW',   // Awaiting human validation
  PUBLISHED = 'PUBLISHED',   // Active and visible
  ARCHIVED = 'ARCHIVED',     // No longer active but kept for history
  DEROGATED = 'DEROGATED',   // Legally repealed/invalidated
}

/**
 * Document Relation Type - How documents relate to each other
 */
export enum DocumentRelationType {
  DEROGA = 'DEROGA',               // Repeals/abolishes
  MODIFICA = 'MODIFICA',           // Modifies/amends
  COMPLEMENTA = 'COMPLEMENTA',     // Complements/supplements
  SUSTITUYE = 'SUSTITUYE',         // Replaces/substitutes
  ACLARA = 'ACLARA',               // Clarifies
  REGLAMENTA = 'REGLAMENTA',       // Regulates/implements
}

/**
 * Document Scope - Geographic/jurisdictional reach
 */
export enum DocumentScope {
  NACIONAL = 'NACIONAL',             // National level
  REGIONAL = 'REGIONAL',             // Regional/Departmental level
  MUNICIPAL = 'MUNICIPAL',           // Municipal level
  LOCAL = 'LOCAL',                   // Local level
  INTERNACIONAL = 'INTERNACIONAL',   // International level
}

/**
 * Processing Status - State of document processing (OCR, embedding, etc.)
 */
export enum ProcessingStatus {
  PENDING = 'PENDING',         // Not yet processed
  PROCESSING = 'PROCESSING',   // Currently being processed
  COMPLETED = 'COMPLETED',     // Successfully processed
  FAILED = 'FAILED',           // Processing failed
  SKIPPED = 'SKIPPED',         // Skipped (e.g., embedding skipped due to prior error)
  MANUAL = 'MANUAL',           // Manual entry (no processing needed)
}

/**
 * Helper function to get hierarchy level from DocumentType
 */
export function getHierarchyLevel(type: DocumentType): number {
  const hierarchyMap: Record<DocumentType, number> = {
    [DocumentType.CONSTITUCION]: 1,
    [DocumentType.TRATADO_INTERNACIONAL]: 2,
    [DocumentType.LEY_ORGANICA]: 3,
    [DocumentType.LEY_ORDINARIA]: 4,
    [DocumentType.DECRETO_LEY]: 5,
    [DocumentType.DECRETO]: 6,
    [DocumentType.REGLAMENTO]: 7,
    [DocumentType.ORDENANZA]: 8,
    [DocumentType.RESOLUCION]: 9,
    [DocumentType.ACUERDO]: 10,
    [DocumentType.CIRCULAR]: 11,
    [DocumentType.DIRECTIVA]: 12,
    [DocumentType.OTRO]: 13,
  };

  return hierarchyMap[type];
}
