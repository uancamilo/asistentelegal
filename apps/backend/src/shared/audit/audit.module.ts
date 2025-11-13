import { Module } from '@nestjs/common';
import { AuditService, AUDIT_LOG_REPOSITORY } from './audit.service';
import { PrismaAuditLogRepository } from './repositories/PrismaAuditLog.repository';
import { PrismaModule } from '../../database/prisma.module';
import { RateLimitingModule } from '../rate-limiting/rate-limiting.module';
import { AuditController } from './audit.controller';
import { GetAuditLogsUseCase } from './application/use-cases/GetAuditLogs/GetAuditLogs.use-case';

@Module({
  imports: [
    PrismaModule,
    RateLimitingModule,
  ],
  controllers: [AuditController],
  providers: [
    AuditService,
    GetAuditLogsUseCase,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: PrismaAuditLogRepository,
    },
  ],
  exports: [AuditService, AUDIT_LOG_REPOSITORY],
})
export class AuditModule {}
