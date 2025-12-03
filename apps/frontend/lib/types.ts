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
  hierarchyLevel?: number;
  sourceUrl?: string | null;
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
  sourceUrl?: string;
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

// Audit Types
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  INVITE = 'INVITE',
  ACTIVATE = 'ACTIVATE'
}

export enum AuditResource {
  USER = 'USER',
  ACCOUNT = 'ACCOUNT',
  DOCUMENT = 'DOCUMENT',
  SESSION = 'SESSION',
  INVITATION = 'INVITATION'
}

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  success: boolean;
  ipAddress?: string;
  details?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
}

// Profile Types (API response - uses string literals for compatibility)
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  status: string;
  accountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountData {
  id: string;
  name: string;
  ownerId: string | null;
  createdBy: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isSystemAccount: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompleteProfile {
  user: UserProfile;
  account: AccountData | null;
}

// Authentication Types
export interface LoginData {
  user: User;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  completeProfile: CompleteProfile | null;
  isLoadingProfile: boolean;
  login: (data: LoginData) => void;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  getUserRole: () => Role | undefined;
  getUserStatus: () => string | undefined;
  isUserActive: () => boolean;
  getRedirectPath: (role: string) => string;
  validateUserAccess: (user: User | null) => { valid: boolean; reason?: string };
}

// Dashboard Types
export interface DashboardStats {
  totalDocuments: number;
  totalUsers: number;
  totalAuditLogs: number;
  recentActivity: AuditLog[];
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface InviteUserFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

// Invitation Types
export interface InvitationData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  accountName: string;
  invitedBy: string;
}

export type PageState = 'validating' | 'valid' | 'invalid' | 'submitting' | 'success' | 'error';

// Document API Types (Additional)
export interface DocumentListResponse {
  documents: Document[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface FilterDocumentsRequest {
  query?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  scope?: DocumentScope;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
  searchText?: string;
}

export interface DocumentStatistics {
  totalDocuments: number;
  totalPublished: number;
  totalDrafts: number;
  totalArchived: number;
  documentsByType: Record<DocumentType, number>;
  documentsByScope: Record<DocumentScope, number>;
}

export interface DocumentFile {
  id: string;
  documentId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface SemanticSearchRequest {
  query: string;
  type?: DocumentType;
  scope?: DocumentScope;
  limit?: number;
  threshold?: number;
}

export interface HybridSearchRequest extends SemanticSearchRequest {
  useSemanticSearch: boolean;
  semanticWeight?: number;
  includeKeywordSearch?: boolean;
}