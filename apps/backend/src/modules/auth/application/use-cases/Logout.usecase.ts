import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../user/domain/constants/tokens';
import { IUserRepository } from '../../../user/domain/interfaces/IUserRepository';
import { AuditAction } from '../../../../shared/audit/enums/AuditAction.enum';
import { AuditResource } from '../../../../shared/audit/enums/AuditResource.enum';
import { LogoutResponseDto } from '../dtos/Logout.dto';
import { PrismaService } from '../../../../database/prisma.service';
import { CacheService } from '../../../../shared/cache/cache.service';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  async execute(userId: string): Promise<LogoutResponseDto> {
    // 1. Buscar usuario
    const user = await this.userRepository.findById(userId);

    if (!user) {
      // Usuario no encontrado, pero retornamos éxito por seguridad
      // (no revelar si el usuario existe o no)
      return { message: 'Logout successful' };
    }

    // 2. Incrementar tokenVersion para invalidar todos los tokens previos
    const newTokenVersion = user.tokenVersion + 1;

    // 3-4. Actualizar usuario y registrar auditoría en una transacción atómica
    // Garantiza que la invalidación de tokens y su auditoría se completen o fallen juntas
    await this.prisma.$transaction(async (tx) => {
      // 3a. Guardar el usuario actualizado con nuevo tokenVersion
      await tx.user.update({
        where: { id: userId },
        data: {
          tokenVersion: newTokenVersion,
          updatedAt: new Date(),
        },
      });

      // 4a. Registrar auditoría de logout exitoso (dentro de la misma transacción)
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email.getValue(),
          userRole: user.role,
          action: AuditAction.LOGOUT,
          resource: AuditResource.AUTH,
          resourceId: user.id,
          resourceName: user.email.getValue(),
          details: { tokenVersion: newTokenVersion },
          success: true,
        },
      });
    });

    // 4b. Invalidate user cache after logout (force re-fetch on next auth)
    await this.cacheService.invalidateUser(userId);

    // 5. Retornar respuesta exitosa
    return { message: 'Logout successful' };
  }
}
