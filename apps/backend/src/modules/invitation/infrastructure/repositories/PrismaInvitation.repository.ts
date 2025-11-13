import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { IInvitationRepository } from '../../domain/interfaces/IInvitationRepository';
import {
  AccountInvitationEntity,
  InvitationStatus,
} from '../../domain/entities/AccountInvitation.entity';
import { InvitationStatus as PrismaInvitationStatus } from '@prisma/client';

@Injectable()
export class PrismaInvitationRepository implements IInvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AccountInvitationEntity | null> {
    const invitation = await this.prisma.accountInvitation.findUnique({
      where: { id },
    });

    return invitation ? this.toDomain(invitation) : null;
  }

  async findByToken(token: string): Promise<AccountInvitationEntity | null> {
    const invitation = await this.prisma.accountInvitation.findUnique({
      where: { token },
    });

    return invitation ? this.toDomain(invitation) : null;
  }

  async findPendingByAccountId(accountId: string): Promise<AccountInvitationEntity[]> {
    const invitations = await this.prisma.accountInvitation.findMany({
      where: {
        accountId,
        status: PrismaInvitationStatus.PENDING,
      },
    });

    return invitations.map((inv) => this.toDomain(inv));
  }

  /**
   * Find invitations by email
   *
   * PERFORMANCE FIX (P3.4): Added pagination limit to prevent unbounded queries
   * @param email - Email to search for
   * @param limit - Maximum number of results (default: 100)
   */
  async findByEmail(email: string, limit: number = 100): Promise<AccountInvitationEntity[]> {
    const invitations = await this.prisma.accountInvitation.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limit), 100), // SECURITY FIX P3.4: Enforce max 100 records
    });

    return invitations.map((inv) => this.toDomain(inv));
  }

  async create(invitation: AccountInvitationEntity): Promise<AccountInvitationEntity> {
    const created = await this.prisma.accountInvitation.create({
      data: {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        accountId: invitation.accountId,
        maxUsers: invitation.maxUsers,
        expiresAt: invitation.expiresAt,
        status: invitation.status as PrismaInvitationStatus,
        createdAt: invitation.createdAt,
        updatedAt: invitation.updatedAt,
      },
    });

    return this.toDomain(created);
  }

  async update(
    id: string,
    data: Partial<AccountInvitationEntity>
  ): Promise<AccountInvitationEntity> {
    const updated = await this.prisma.accountInvitation.update({
      where: { id },
      data: {
        status: data.status as PrismaInvitationStatus | undefined,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.accountInvitation.delete({
      where: { id },
    });
  }

  async findExpired(): Promise<AccountInvitationEntity[]> {
    const invitations = await this.prisma.accountInvitation.findMany({
      where: {
        status: PrismaInvitationStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return invitations.map((inv) => this.toDomain(inv));
  }

  async hasPendingInvitation(accountId: string): Promise<boolean> {
    const count = await this.prisma.accountInvitation.count({
      where: {
        accountId,
        status: PrismaInvitationStatus.PENDING,
      },
    });

    return count > 0;
  }

  /**
   * Convierte un modelo de Prisma a una entidad de dominio
   */
  private toDomain(prismaInvitation: any): AccountInvitationEntity {
    return new AccountInvitationEntity(
      prismaInvitation.id,
      prismaInvitation.email,
      prismaInvitation.token,
      prismaInvitation.accountId,
      prismaInvitation.maxUsers,
      prismaInvitation.expiresAt,
      prismaInvitation.status as InvitationStatus,
      prismaInvitation.createdAt,
      prismaInvitation.updatedAt
    );
  }
}
