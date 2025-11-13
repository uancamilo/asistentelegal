import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/constants/tokens';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { UserEntity, Role } from '../../../domain/entities/User.entity';
import {
  UpdateUserStatusRequestDto,
  UpdateUserStatusResponseDto,
} from './UpdateUserStatus.dto';
import { AuditAction } from '../../../../../shared/audit/enums/AuditAction.enum';
import { AuditResource } from '../../../../../shared/audit/enums/AuditResource.enum';
import { PrismaService } from '../../../../../database/prisma.service';

/**
 * Use Case: Cambiar el estado de un usuario
 *
 * Reglas de negocio:
 * 1. Solo SUPER_ADMIN puede cambiar el estado de usuarios de la cuenta EMPLEADOS
 * 2. ADMIN puede cambiar el estado de usuarios de cuentas de clientes
 * 3. No se puede cambiar el estado de uno mismo
 * 4. No se puede cambiar el estado de un usuario con rol SUPER_ADMIN
 * 5. Se registra en auditoría
 */
@Injectable()
export class UpdateUserStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    userId: string,
    dto: UpdateUserStatusRequestDto,
    currentUser: UserEntity
  ): Promise<UpdateUserStatusResponseDto> {
    // 1. Buscar el usuario
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with id "${userId}" not found`);
    }

    // 2. Verificar que no se está cambiando el estado de sí mismo
    if (user.id === currentUser.id) {
      throw new BadRequestException('You cannot change your own status');
    }

    // 3. Verificar que no se está cambiando el estado de un SUPER_ADMIN
    if (user.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('Cannot change status of super admin user');
    }

    // 4. Verificar permisos
    if (currentUser.role === Role.SUPER_ADMIN) {
      // Permitido para cualquier usuario
    } else if (currentUser.role === Role.ADMIN) {
      // Solo puede cambiar estado de usuarios de cuentas de clientes
      // Buscar la cuenta del usuario para verificar si es sistema
      if (user.accountId) {
        const account = await this.prisma.account.findUnique({
          where: { id: user.accountId },
          select: { isSystemAccount: true },
        });

        if (!account || account.isSystemAccount) {
          throw new ForbiddenException(
            'Admins cannot change status of system account users'
          );
        }
      }
    } else {
      throw new ForbiddenException(
        'You do not have permission to change user status'
      );
    }

    // 6. Verificar si el estado ya es el mismo
    if (user.status === dto.status) {
      throw new BadRequestException(
        `User is already in ${dto.status} status`
      );
    }

    const oldStatus = user.status;

    // 7. Actualizar estado y registrar auditoría en transacción
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      // 7a. Actualizar estado del usuario
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          status: dto.status,
          updatedAt: new Date(),
        },
      });

      // 7b. Registrar auditoría
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          userEmail: currentUser.email.getValue(),
          userRole: currentUser.role,
          action: AuditAction.UPDATE,
          resource: AuditResource.USER,
          resourceId: updated.id,
          resourceName: `${updated.firstName} ${updated.lastName}`,
          details: {
            changes: {
              status: {
                from: oldStatus,
                to: dto.status,
              },
            },
          },
          success: true,
        },
      });

      return updated;
    });

    // 8. Retornar respuesta
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      status: updatedUser.status,
      updatedAt: updatedUser.updatedAt,
    };
  }
}
