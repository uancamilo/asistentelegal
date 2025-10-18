import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserEntity, Role, UserStatus } from '../../domain/entities/User.entity';
import { Email } from '../../domain/value-objects/Email.vo';

type PrismaUser = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  accountId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma['user'].findUnique({
      where: { id },
    });

    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: Email): Promise<UserEntity | null> {
    const user = await this.prisma['user'].findUnique({
      where: { email: email.getValue() },
    });

    return user ? this.toDomain(user) : null;
  }

  async findByRole(role: Role): Promise<UserEntity[]> {
    const users = await this.prisma['user'].findMany({
      where: { role },
    });

    return users.map((user: PrismaUser) => this.toDomain(user));
  }

  async findByAccountId(accountId: string): Promise<UserEntity[]> {
    const users = await this.prisma['user'].findMany({
      where: { accountId },
    });

    return users.map((user: PrismaUser) => this.toDomain(user));
  }

  async findByStatus(status: UserStatus): Promise<UserEntity[]> {
    const users = await this.prisma['user'].findMany({
      where: { status },
    });

    return users.map((user: PrismaUser) => this.toDomain(user));
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma['user'].findMany();
    return users.map((user: PrismaUser) => this.toDomain(user));
  }

  async create(user: UserEntity): Promise<UserEntity> {
    const createdUser = await this.prisma['user'].create({
      data: {
        id: user.id,
        email: user.email.getValue(),
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        accountId: user.accountId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });

    return this.toDomain(createdUser);
  }

  async update(id: string, userData: Partial<UserEntity>): Promise<UserEntity> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (userData.email) {
      updateData.email = userData.email.getValue();
    }
    if (userData.firstName !== undefined) {
      updateData.firstName = userData.firstName;
    }
    if (userData.lastName !== undefined) {
      updateData.lastName = userData.lastName;
    }
    if (userData.status !== undefined) {
      updateData.status = userData.status;
    }
    if (userData.updatedAt !== undefined) {
      updateData.updatedAt = userData.updatedAt;
    }

    const updatedUser = await this.prisma['user'].update({
      where: { id },
      data: updateData,
    });

    return this.toDomain(updatedUser);
  }

  async delete(id: string): Promise<void> {
    await this.prisma['user'].delete({
      where: { id },
    });
  }

  async countByRole(role: Role): Promise<number> {
    return await this.prisma['user'].count({
      where: { role },
    });
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.prisma['user'].count({
      where: { email: email.getValue() },
    });
    return count > 0;
  }

  /**
   * Convierte un modelo de Prisma a una entidad de dominio
   */
  private toDomain(prismaUser: PrismaUser): UserEntity {
    return new UserEntity(
      prismaUser.id,
      Email.create(prismaUser.email),
      prismaUser.passwordHash,
      prismaUser.firstName,
      prismaUser.lastName,
      prismaUser.role as Role,
      prismaUser.status as UserStatus,
      prismaUser.accountId,
      prismaUser.createdAt,
      prismaUser.updatedAt
    );
  }
}
