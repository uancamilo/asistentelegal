import { AccountEntity } from '../entities/Account.entity';

export interface IAccountRepository {
  // Búsquedas
  findById(id: string): Promise<AccountEntity | null>;
  findByName(name: string): Promise<AccountEntity | null>;
  findByOwnerId(ownerId: string): Promise<AccountEntity | null>;
  findAll(): Promise<AccountEntity[]>;

  // Operaciones CRUD
  create(account: AccountEntity): Promise<AccountEntity>;
  update(id: string, account: Partial<AccountEntity>): Promise<AccountEntity>;
  delete(id: string): Promise<void>;

  // Operaciones especiales
  existsByName(name: string): Promise<boolean>;
}

export const ACCOUNT_REPOSITORY = Symbol('IAccountRepository');
