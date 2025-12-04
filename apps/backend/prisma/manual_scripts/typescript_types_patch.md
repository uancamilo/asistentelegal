# TypeScript Types Patch

## 1. Update DocumentCreateData (Document.entity.ts ~line 11-28)

Add these fields to the interface:

```typescript
export interface DocumentCreateData {
  // ... existing fields ...

  // NEW: Processing & review fields
  processingStatus?: string;   // 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'MANUAL'
  embeddingStatus?: string;    // Same values
  embeddingError?: string | null;
  sourceUrl?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  rejectionReason?: string | null;
}
```

## 2. Update DocumentEntity constructor (Document.entity.ts ~line 39-62)

Add new properties to the class:

```typescript
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
    // NEW: Processing & review fields
    public processingStatus: string = 'MANUAL',
    public embeddingStatus: string = 'PENDING',
    public embeddingError: string | null = null,
    public sourceUrl: string | null = null,
    public reviewedBy: string | null = null,
    public reviewedAt: Date | null = null,
    public rejectionReason: string | null = null,
  ) {
    this.validate();
  }
```

## 3. Update DocumentEntity.create() factory method (~line 67-98)

Add new fields to the return object:

```typescript
static create(params: {
  // ... existing params ...
  sourceUrl?: string;
  processingStatus?: string;
}): DocumentCreateData {
  // ... existing logic ...

  return {
    // ... existing fields ...

    // NEW fields with defaults
    processingStatus: params.processingStatus || 'MANUAL',
    embeddingStatus: 'PENDING',
    embeddingError: null,
    sourceUrl: params.sourceUrl || null,
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
  };
}
```

## 4. Add ProcessingStatus to DocumentEnums.ts (if not already exported)

```typescript
// Re-export from Prisma or define locally
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'MANUAL';
```

## Backward Compatibility Notes

- All new fields have defaults, so existing code continues to work
- `DocumentEntity` constructor now has 7 new optional parameters at the end
- Existing `toDomain()` calls will work because new params have defaults
- No changes needed to use-case signatures
