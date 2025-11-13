import { Injectable } from '@nestjs/common';
import { Prisma, AccountStatus } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { IAccountRepository } from '../../domain/interfaces/IAccountRepository';
import { AccountEntity } from '../../domain/entities/Account.entity';

type PrismaAccount = {
  id: string;
  name: string;
  ownerId: string | null;
  createdBy: string;
  status: AccountStatus;
  isSystemAccount: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AccountEntity | null> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    return account ? this.toDomain(account) : null;
  }

  async findByName(name: string): Promise<AccountEntity | null> {
    const account = await this.prisma.account.findUnique({
      where: { name },
    });

    return account ? this.toDomain(account) : null;
  }

  async findByOwnerId(ownerId: string): Promise<AccountEntity | null> {
    const account = await this.prisma.account.findUnique({
      where: { ownerId },
    });

    return account ? this.toDomain(account) : null;
  }

  async findAll(limit: number, offset: number): Promise<AccountEntity[]> {
    const accounts = await this.prisma.account.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      // Eagerly load owner relationship to prevent N+1 queries
      include: {
        owner: true,
      },
    });
    return accounts.map((account: PrismaAccount) => this.toDomain(account));
  }

  async findClientAccounts(limit: number, offset: number): Promise<AccountEntity[]> {
    // Find only client accounts (isSystemAccount = false) - excludes system accounts like "Employees"
    const accounts = await this.prisma.account.findMany({
      where: {
        isSystemAccount: false,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
      },
    });
    return accounts.map((account: PrismaAccount) => this.toDomain(account));
  }

  async create(account: AccountEntity): Promise<AccountEntity> {
    const createdAccount = await this.prisma.account.create({
      data: {
        id: account.id,
        name: account.name,
        ownerId: account.ownerId,
        createdBy: account.createdBy,
        status: account.status,
        isSystemAccount: account.isSystemAccount,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    });

    return this.toDomain(createdAccount);
  }

  async update(id: string, accountData: Partial<AccountEntity>): Promise<AccountEntity> {
    const updateData: Prisma.AccountUpdateInput = {};

    if (accountData.name !== undefined) {
      updateData.name = accountData.name;
    }
    if (accountData.updatedAt !== undefined) {
      updateData.updatedAt = accountData.updatedAt;
    }

    const updatedAccount = await this.prisma.account.update({
      where: { id },
      data: updateData,
    });

    return this.toDomain(updatedAccount);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.account.delete({
      where: { id },
    });
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.prisma.account.count({
      where: { name },
    });
    return count > 0;
  }

  async countClientAccounts(): Promise<number> {
    // Count only client accounts (isSystemAccount = false)
    return await this.prisma.account.count({
      where: {
        isSystemAccount: false,
      },
    });
  }

  /**
   * Convierte un modelo de Prisma a una entidad de dominio
   */
  private toDomain(prismaAccount: PrismaAccount): AccountEntity {
    return new AccountEntity(
      prismaAccount.id,
      prismaAccount.name,
      prismaAccount.ownerId,
      prismaAccount.createdBy,
      prismaAccount.status as any,
      prismaAccount.isSystemAccount,
      prismaAccount.createdAt,
      prismaAccount.updatedAt
    );
  }
}
