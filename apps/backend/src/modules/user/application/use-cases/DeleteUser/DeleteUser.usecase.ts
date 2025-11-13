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
import { DeleteUserResponseDto } from './DeleteUser.dto';
import { AuditAction } from '../../../../../shared/audit/enums/AuditAction.enum';
import { AuditResource } from '../../../../../shared/audit/enums/AuditResource.enum';
import { PrismaService } from '../../../../../database/prisma.service';

/**
 * Use Case: Eliminar un usuario
 *
 * Reglas de negocio:
 * 1. Solo SUPER_ADMIN puede eliminar usuarios de la cuenta EMPLEADOS
 * 2. ADMIN puede eliminar usuarios de cuentas de clientes
 * 3. No se puede eliminar a sí mismo
 * 4. No se puede eliminar al propietario de una cuenta (ACCOUNT_OWNER)
 * 5. No se puede eliminar a un usuario con rol SUPER_ADMIN
 * 6. Se registra en auditoría
 */
@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    userId: string,
    currentUser: UserEntity
  ): Promise<DeleteUserResponseDto> {
    // 1. Buscar el usuario
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with id "${userId}" not found`);
    }

    // 2. Verificar que no se está eliminando a sí mismo
    if (user.id === currentUser.id) {
      throw new BadRequestException('You cannot delete yourself');
    }

    // 3. Verificar que no se está eliminando a un propietario de cuenta
    if (user.role === Role.ACCOUNT_OWNER) {
      throw new BadRequestException('Cannot delete account owner');
    }

    // 4. Verificar que no se está eliminando a un SUPER_ADMIN
    if (user.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete super admin user');
    }

    // 5. Verificar permisos
    if (currentUser.role === Role.SUPER_ADMIN) {
      // Permitido para cualquier usuario
    } else if (currentUser.role === Role.ADMIN) {
      // Solo puede eliminar usuarios de cuentas de clientes
      // Buscar la cuenta del usuario para verificar si es sistema
      if (user.accountId) {
        const account = await this.prisma.account.findUnique({
          where: { id: user.accountId },
          select: { isSystemAccount: true },
        });

        if (!account || account.isSystemAccount) {
          throw new ForbiddenException(
            'Admins cannot delete system account users'
          );
        }
      }
    } else {
      throw new ForbiddenException(
        'You do not have permission to delete users'
      );
    }

    const userEmail = user.email.getValue();
    const userName = `${user.firstName} ${user.lastName}`;

    // 7. Eliminar usuario y registrar auditoría en transacción
    await this.prisma.$transaction(async (tx) => {
      // 7a. Registrar auditoría ANTES de eliminar
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          userEmail: currentUser.email.getValue(),
          userRole: currentUser.role,
          action: AuditAction.DELETE,
          resource: AuditResource.USER,
          resourceId: user.id,
          resourceName: userName,
          details: {
            email: userEmail,
            role: user.role,
            accountId: user.accountId,
          },
          success: true,
        },
      });

      // 7b. Eliminar usuario
      await tx.user.delete({
        where: { id: userId },
      });
    });

    // 8. Retornar respuesta
    return {
      id: user.id,
      email: userEmail,
      message: `User ${userName} has been deleted successfully`,
    };
  }
}
