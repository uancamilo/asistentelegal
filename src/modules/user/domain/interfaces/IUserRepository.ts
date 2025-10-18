import { UserEntity, Role, UserStatus } from '../entities/User.entity';
import { Email } from '../value-objects/Email.vo';

export interface IUserRepository {
  // Búsquedas
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: Email): Promise<UserEntity | null>;
  findByRole(role: Role): Promise<UserEntity[]>;
  findByAccountId(accountId: string): Promise<UserEntity[]>;
  findByStatus(status: UserStatus): Promise<UserEntity[]>;
  findAll(): Promise<UserEntity[]>;

  // Operaciones CRUD
  create(user: UserEntity): Promise<UserEntity>;
  update(id: string, user: Partial<UserEntity>): Promise<UserEntity>;
  delete(id: string): Promise<void>;

  // Operaciones especiales
  countByRole(role: Role): Promise<number>;
  existsByEmail(email: Email): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
