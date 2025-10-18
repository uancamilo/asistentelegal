import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { IAccountRepository } from '../../domain/interfaces/IAccountRepository';
import { AccountEntity } from '../../domain/entities/Account.entity';

type PrismaAccount = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AccountEntity | null> {
    const account = await this.prisma['account'].findUnique({
      where: { id },
    });

    return account ? this.toDomain(account) : null;
  }

  async findByName(name: string): Promise<AccountEntity | null> {
    const account = await this.prisma['account'].findUnique({
      where: { name },
    });

    return account ? this.toDomain(account) : null;
  }

  async findByOwnerId(ownerId: string): Promise<AccountEntity | null> {
    const account = await this.prisma['account'].findUnique({
      where: { ownerId },
    });

    return account ? this.toDomain(account) : null;
  }

  async findAll(): Promise<AccountEntity[]> {
    const accounts = await this.prisma['account'].findMany();
    return accounts.map((account: PrismaAccount) => this.toDomain(account));
  }

  async create(account: AccountEntity): Promise<AccountEntity> {
    const createdAccount = await this.prisma['account'].create({
      data: {
        id: account.id,
        name: account.name,
        ownerId: account.ownerId,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    });

    return this.toDomain(createdAccount);
  }

  async update(id: string, accountData: Partial<AccountEntity>): Promise<AccountEntity> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (accountData.name !== undefined) {
      updateData.name = accountData.name;
    }
    if (accountData.updatedAt !== undefined) {
      updateData.updatedAt = accountData.updatedAt;
    }

    const updatedAccount = await this.prisma['account'].update({
      where: { id },
      data: updateData,
    });

    return this.toDomain(updatedAccount);
  }

  async delete(id: string): Promise<void> {
    await this.prisma['account'].delete({
      where: { id },
    });
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.prisma['account'].count({
      where: { name },
    });
    return count > 0;
  }

  /**
   * Convierte un modelo de Prisma a una entidad de dominio
   */
  private toDomain(prismaAccount: PrismaAccount): AccountEntity {
    return new AccountEntity(
      prismaAccount.id,
      prismaAccount.name,
      prismaAccount.ownerId,
      prismaAccount.createdAt,
      prismaAccount.updatedAt
    );
  }
}
