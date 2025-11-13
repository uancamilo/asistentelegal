import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogEntity } from '../entities/AuditLog.entity';
import {
  IAuditLogRepository,
  CreateAuditLogDto,
  AuditLogFilters,
} from './IAuditLog.repository';

/**
 * Implementación de Prisma del repositorio de logs de auditoría
 */
@Injectable()
export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un nuevo log de auditoría
   */
  async create(data: CreateAuditLogDto): Promise<AuditLogEntity> {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        userEmail: data.userEmail,
        userRole: data.userRole,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        resourceName: data.resourceName ?? null,
        details: data.details ? (data.details as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        success: data.success ?? true,
        errorMessage: data.errorMessage ?? null,
      },
    });

    return AuditLogEntity.fromPrisma(auditLog);
  }

  /**
   * Busca logs con filtros
   */
  async find(filters: AuditLogFilters): Promise<AuditLogEntity[]> {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resource) {
      where.resource = filters.resource;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.success !== undefined) {
      where.success = filters.success;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 100,
      skip: filters.offset ?? 0,
    });

    return logs.map((log) => AuditLogEntity.fromPrisma(log));
  }

  /**
   * Cuenta logs que coinciden con los filtros
   */
  async count(
    filters: Omit<AuditLogFilters, 'limit' | 'offset'>
  ): Promise<number> {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resource) {
      where.resource = filters.resource;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.success !== undefined) {
      where.success = filters.success;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return await this.prisma.auditLog.count({ where });
  }

  /**
   * Busca un log por ID
   */
  async findById(id: string): Promise<AuditLogEntity | null> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
    });

    return log ? AuditLogEntity.fromPrisma(log) : null;
  }

  /**
   * Busca logs por usuario
   */
  async findByUserId(
    userId: string,
    limit: number = 100
  ): Promise<AuditLogEntity[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => AuditLogEntity.fromPrisma(log));
  }

  /**
   * Busca logs por recurso
   */
  async findByResource(
    resource: string,
    resourceId: string,
    limit: number = 100
  ): Promise<AuditLogEntity[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        resource,
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => AuditLogEntity.fromPrisma(log));
  }
}
