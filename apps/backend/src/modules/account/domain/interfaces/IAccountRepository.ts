import { AccountEntity } from '../entities/Account.entity';

export interface IAccountRepository {
  // Búsquedas
  findById(id: string): Promise<AccountEntity | null>;
  findByName(name: string): Promise<AccountEntity | null>;
  findByOwnerId(ownerId: string): Promise<AccountEntity | null>;
  findAll(limit: number, offset: number): Promise<AccountEntity[]>;
  findClientAccounts(limit: number, offset: number): Promise<AccountEntity[]>; // Client accounts only (isSystemAccount = false)

  // Operaciones CRUD
  create(account: AccountEntity): Promise<AccountEntity>;
  update(id: string, account: Partial<AccountEntity>): Promise<AccountEntity>;
  delete(id: string): Promise<void>;

  // Operaciones especiales
  existsByName(name: string): Promise<boolean>;
  countClientAccounts(): Promise<number>; // Count client accounts only
}

export const ACCOUNT_REPOSITORY = Symbol('IAccountRepository');
