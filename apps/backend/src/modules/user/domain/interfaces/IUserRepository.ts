import { UserEntity, Role, UserStatus } from '../entities/User.entity';
import { Email } from '../value-objects/Email.vo';

export interface IUserRepository {
  // Búsquedas
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: Email): Promise<UserEntity | null>;
  findByRole(role: Role): Promise<UserEntity[]>;
  findByAccountId(accountId: string): Promise<UserEntity[]>;
  findByStatus(status: UserStatus): Promise<UserEntity[]>;
  findAll(limit: number, offset: number): Promise<UserEntity[]>;
  findClientUsers(limit: number, offset: number): Promise<UserEntity[]>; // Client users only (ACCOUNT_OWNER, MEMBER)

  // Operaciones CRUD
  create(user: UserEntity): Promise<UserEntity>;
  update(id: string, user: Partial<UserEntity>): Promise<UserEntity>;
  delete(id: string): Promise<void>;

  // Operaciones especiales
  countByRole(role: Role): Promise<number>;
  countClientUsers(): Promise<number>; // Count client users only
  existsByEmail(email: Email): Promise<boolean>;
}

export { USER_REPOSITORY } from '../constants/tokens';
