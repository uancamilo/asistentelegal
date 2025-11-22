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
  status: AccountStatus;
  ownerId: string | null;
  isSystemAccount: boolean;
  createdAt: string;
  updatedAt: string;
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

export enum DocumentScope {
  INTERNACIONAL = 'INTERNACIONAL',
  NACIONAL = 'NACIONAL',
  REGIONAL = 'REGIONAL',
  MUNICIPAL = 'MUNICIPAL',
  LOCAL = 'LOCAL',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface Document {
  id: string;
  title: string;
  documentNumber: string | null;
  type: DocumentType;
  scope: DocumentScope;
  status: DocumentStatus;
  issuingEntity: string;
  summary: string | null;
  fullText: string | null;
  keywords: string[] | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CreateDocumentRequest {
  title: string;
  documentNumber?: string;
  type: DocumentType;
  scope: DocumentScope;
  issuingEntity: string;
  summary?: string;
  fullText?: string;
  keywords?: string[];
}

export interface UpdateDocumentRequest extends Partial<CreateDocumentRequest> {
  status?: DocumentStatus;
}

export interface DocumentSearchFilters {
  query?: string;
  type?: DocumentType;
  scope?: DocumentScope;
  status?: DocumentStatus;
  limit?: number;
  page?: number;
}

// Search Types
export interface SearchResult {
  id: string;
  title: string;
  documentNumber: string | null;
  type: DocumentType;
  scope: DocumentScope;
  status: DocumentStatus;
  issuingEntity: string;
  summary: string | null;
  excerpt?: string;
  score?: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fullText: string | null;
  isActive: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  executionTime: number | null;
  query: string;
  isSemanticSearch?: boolean;
}

export interface DocumentsResponse {
  documents: Document[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

// API Error Types
export interface ApiErrorResponse {
  message: string;
  error?: string;
  statusCode: number;
  timestamp: string;
  path: string;
}

export interface ApiError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    statusText?: string;
  };
  message?: string;
  code?: string;
}

// Toast/Notification Types
export interface ToastMessage {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

// Loading Indicator Types
export type LoadingSize = 'sm' | 'md' | 'lg';
export type LoadingHeight = 'sm' | 'md' | 'lg';
export type LoadingBackground = 'default' | 'gradient';

export interface LoadingIndicatorProps {
  message?: string;
  size?: LoadingSize;
  className?: string;
  center?: boolean;
  inline?: boolean;
}

export interface PageLoadingIndicatorProps {
  message?: string;
  size?: LoadingSize;
  className?: string;
  background?: LoadingBackground;
}

export interface ComponentLoadingIndicatorProps {
  message?: string;
  size?: LoadingSize;
  height?: LoadingHeight;
  className?: string;
}

export interface ModalLoadingIndicatorProps {
  message?: string;
  size?: LoadingSize;
  className?: string;
}

export interface ButtonLoadingIndicatorProps {
  message?: string;
  size?: LoadingSize;
}