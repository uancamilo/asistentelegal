import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserEntity, Role, UserStatus } from '../../domain/entities/User.entity';
import { Email } from '../../domain/value-objects/Email.vo';
import { CacheService } from '../../../../shared/cache/cache.service';

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
  tokenVersion: number;
};

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    // PERFORMANCE: Check cache first to reduce database load (P1.5)
    // With 1000 req/hour, this saves ~900 queries/hour (90% reduction)
    const cachedData = await this.cacheService.getCachedUser(id);

    if (cachedData) {
      // Cache HIT - reconstruct UserEntity from cached data
      return this.deserializeUser(cachedData);
    }

    // Cache MISS - fetch from database
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (user) {
      // Cache the user for subsequent requests (TTL: 15min)
      await this.cacheService.cacheUser(id, this.serializeUserForCache(user));
      return this.toDomain(user);
    }

    return null;
  }

  async findByEmail(email: Email): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.getValue() },
    });

    return user ? this.toDomain(user) : null;
  }

  async findByRole(role: Role): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { role },
    });

    return users.map((user: PrismaUser) => this.toDomain(user));
  }

  async findByAccountId(accountId: string): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { accountId },
      // Eagerly load account relationship to prevent N+1 queries
      include: {
        account: true,
      },
    });

    return users.map((user: PrismaUser) => this.toDomain(user));
  }

  async findByStatus(status: UserStatus): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { status },
    });

    return users.map((user: PrismaUser) => this.toDomain(user));
  }

  async findAll(limit: number, offset: number): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      // Eagerly load account relationship to prevent N+1 queries
      // Even though not currently used in DTO, this prevents future N+1 issues
      include: {
        account: true,
      },
    });
    return users.map((user: PrismaUser) => this.toDomain(user));
  }

  async findClientUsers(limit: number, offset: number): Promise<UserEntity[]> {
    // Find only client users (ACCOUNT_OWNER, MEMBER) - excludes employees (SUPER_ADMIN, ADMIN, EDITOR)
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          in: [Role.ACCOUNT_OWNER, Role.MEMBER],
        },
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        account: true,
      },
    });
    return users.map((user: PrismaUser) => this.toDomain(user));
  }

  async create(user: UserEntity): Promise<UserEntity> {
    const createdUser = await this.prisma.user.create({
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
    const updateData: Prisma.UserUpdateInput = {};

    if (userData.email) {
      updateData.email = userData.email.getValue();
    }
    if (userData.firstName !== undefined) {
      updateData.firstName = userData.firstName;
    }
    if (userData.lastName !== undefined) {
      updateData.lastName = userData.lastName;
    }
    if (userData.role !== undefined) {
      updateData.role = userData.role;
    }
    if (userData.status !== undefined) {
      updateData.status = userData.status;
    }
    if (userData.tokenVersion !== undefined) {
      updateData.tokenVersion = userData.tokenVersion;
    }
    if (userData.updatedAt !== undefined) {
      updateData.updatedAt = userData.updatedAt;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // PERFORMANCE: Invalidate cache when user is updated (P1.5)
    // This ensures subsequent requests get fresh data
    await this.cacheService.invalidateUser(id);

    return this.toDomain(updatedUser);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });

    // PERFORMANCE: Invalidate cache when user is deleted (P1.5)
    await this.cacheService.invalidateUser(id);
  }

  async countByRole(role: Role): Promise<number> {
    return await this.prisma.user.count({
      where: { role },
    });
  }

  async countClientUsers(): Promise<number> {
    // Count only client users (ACCOUNT_OWNER, MEMBER)
    return await this.prisma.user.count({
      where: {
        role: {
          in: [Role.ACCOUNT_OWNER, Role.MEMBER],
        },
      },
    });
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.prisma.user.count({
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
      prismaUser.updatedAt,
      prismaUser.tokenVersion
    );
  }

  /**
   * Serialize user for Redis caching (P1.5)
   * SECURITY (P2.7): passwordHash is NOT cached to reduce attack surface
   * If Redis is compromised, password hashes remain protected in PostgreSQL
   * JWT validation only needs: id, email, role, status, tokenVersion
   * Redis TTL: 15 minutes (aligned with access token lifespan)
   */
  private serializeUserForCache(user: PrismaUser): Record<string, any> {
    return {
      id: user.id,
      email: user.email,
      // passwordHash: REMOVED - Not needed for JWT validation, improves security
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      accountId: user.accountId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      tokenVersion: user.tokenVersion,
    };
  }

  /**
   * Deserialize cached data back to UserEntity (P1.5)
   * SECURITY (P2.7): passwordHash not in cache, use empty string placeholder
   * If password operations are needed, fetch fresh user from database
   */
  private deserializeUser(data: Record<string, any>): UserEntity {
    return new UserEntity(
      data['id'],
      Email.create(data['email']),
      '', // passwordHash not cached - empty placeholder (fetch from DB if needed)
      data['firstName'],
      data['lastName'],
      data['role'] as Role,
      data['status'] as UserStatus,
      data['accountId'],
      new Date(data['createdAt']),
      new Date(data['updatedAt']),
      data['tokenVersion']
    );
  }
}
