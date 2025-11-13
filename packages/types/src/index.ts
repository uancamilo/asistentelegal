export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'ACCOUNT_OWNER' | 'MEMBER';

export interface LoginDto {
  email: string;
  password: string;
}
