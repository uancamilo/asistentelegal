// User Types
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ACCOUNT_OWNER = 'ACCOUNT_OWNER',
  EDITOR = 'EDITOR',
  MEMBER = 'MEMBER',
}

export enum UserStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  accountId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Account Types
export enum AccountStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface Account {
  id: string;
  name: string;
  ownerId: string | null;
  createdBy: string;
  status: AccountStatus;
  maxUsers: number | null;
  isSystemAccount: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  creator?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Audit Log Types
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ACCESS_DENIED = 'ACCESS_DENIED',
}

export enum AuditResource {
  ACCOUNT = 'ACCOUNT',
  USER = 'USER',
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  resourceName: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

// API Response Types
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Document Types
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

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum DocumentScope {
  NACIONAL = 'NACIONAL',
  REGIONAL = 'REGIONAL',
  MUNICIPAL = 'MUNICIPAL',
  LOCAL = 'LOCAL',
  INTERNACIONAL = 'INTERNACIONAL',
}

export enum DocumentRelationType {
  DEROGA = 'DEROGA',
  MODIFICA = 'MODIFICA',
  COMPLEMENTA = 'COMPLEMENTA',
  SUSTITUYE = 'SUSTITUYE',
  ACLARA = 'ACLARA',
  REGLAMENTA = 'REGLAMENTA',
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Document {
  id: string;
  title: string;
  documentNumber: string | null;
  type: DocumentType;
  hierarchyLevel: number;
  scope: DocumentScope;
  issuingEntity: string;
  isActive: boolean;
  status: DocumentStatus;
  summary: string | null;
  keywords: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fullText?: string | null;
  createdBy?: string;
  updatedBy?: string | null;
  publishedBy?: string | null;
}

export interface DocumentFile {
  id: string;
  documentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  version: number;
  isActive: boolean;
  uploadedBy: string;
  processingStatus: ProcessingStatus;
  processingError: string | null;
  createdAt: string;
}

export interface DocumentRelation {
  id: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  relationType: DocumentRelationType;
  description: string | null;
  createdAt: string;
}

export interface CreateDocumentRequest {
  title: string;
  documentNumber?: string;
  type: DocumentType;
  scope?: DocumentScope;
  issuingEntity: string;
  summary?: string;
  fullText?: string;
  keywords?: string[];
}

export interface UpdateDocumentRequest {
  title?: string;
  documentNumber?: string;
  type?: DocumentType;
  scope?: DocumentScope;
  issuingEntity?: string;
  summary?: string;
  fullText?: string;
  keywords?: string[];
  status?: DocumentStatus;
  isActive?: boolean;
}

export interface FilterDocumentsRequest {
  type?: DocumentType;
  status?: DocumentStatus;
  scope?: DocumentScope;
  isActive?: boolean;
  searchText?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'hierarchyLevel' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DocumentStatistics {
  totalDocuments: number;
  publishedDocuments: number;
  draftDocuments: number;
  archivedDocuments: number;
  byType: Record<DocumentType, number>;
  byScope: Record<DocumentScope, number>;
}

// Search Types (Semantic + Hybrid with OpenAI)
export interface SearchResult {
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
  publishedAt: string | null;
  similarity: number; // Cosine similarity score (0-1)
  relevanceScore: number; // Combined score for hybrid search
  matchType: 'semantic' | 'keyword' | 'hybrid';
  excerpt?: string; // Relevant excerpt from fullText
}

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  similarityThreshold?: number;
  type?: DocumentType;
  scope?: DocumentScope;
  onlyActive?: boolean;
}

export interface HybridSearchRequest extends SemanticSearchRequest {
  semanticWeight?: number; // 0-1, default 0.7
  includeKeywordSearch?: boolean; // default true
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  executionTime: number; // milliseconds
  searchType: 'semantic' | 'hybrid';
}
