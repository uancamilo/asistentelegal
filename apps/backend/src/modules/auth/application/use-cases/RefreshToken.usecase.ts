import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../user/domain/constants/tokens';
import { IUserRepository } from '../../../user/domain/interfaces/IUserRepository';
import { JwtService } from '../../infrastructure/services/Jwt.service';
import { AuditService } from '../../../../shared/audit/audit.service';
import { AuditAction } from '../../../../shared/audit/enums/AuditAction.enum';
import { AuditResource } from '../../../../shared/audit/enums/AuditResource.enum';
import { RefreshTokenRequestDto, RefreshTokenResponseDto } from '../dtos/RefreshToken.dto';
import { UserStatus } from '../../../user/domain/entities/User.entity';
import { PrismaService } from '../../../../database/prisma.service';
import { CacheService } from '../../../../shared/cache/cache.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  async execute(dto: RefreshTokenRequestDto, ipAddress?: string, userAgent?: string): Promise<RefreshTokenResponseDto> {
    // 1. Verificar el refresh token
    let payload;
    try {
      payload = await this.jwtService.verifyRefreshToken(dto.refreshToken);
    } catch (error) {
      // Log failed refresh - invalid token
      await this.auditService.logAuthenticationFailure(
        'unknown',
        AuditAction.REFRESH_TOKEN,
        'Refresh token validation failed: Invalid or expired token',
        ipAddress,
        userAgent,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Buscar usuario
    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      // Log failed refresh - user not found
      await this.auditService.logAuthenticationFailure(
        payload.email,
        AuditAction.REFRESH_TOKEN,
        'Refresh token validation failed: User not found',
        ipAddress,
        userAgent,
        { userId: payload.sub }
      );
      throw new UnauthorizedException('User not found');
    }

    // 3. Verificar que el usuario esté activo
    if (user.status !== UserStatus.ACTIVE) {
      // Log failed refresh - user not active
      await this.auditService.logAuthenticationFailure(
        user.email.getValue(),
        AuditAction.REFRESH_TOKEN,
        `Refresh token validation failed: User status is ${user.status}`,
        ipAddress,
        userAgent,
        { userId: user.id, status: user.status }
      );
      throw new UnauthorizedException('User is not active');
    }

    // 4. Verificar que el token no haya sido revocado
    if (payload.tokenVersion !== user.tokenVersion) {
      // Log token reuse attempt
      await this.auditService.logAuthenticationFailure(
        user.email.getValue(),
        AuditAction.REFRESH_TOKEN,
        'Refresh token validation failed: Token revoked or reused',
        ipAddress,
        userAgent,
        {
          userId: user.id,
          payloadVersion: payload.tokenVersion,
          currentVersion: user.tokenVersion
        }
      );
      throw new UnauthorizedException('Token revoked or invalid');
    }

    // 5. Incrementar tokenVersion para invalidar tokens anteriores (rotation)
    const newTokenVersion = user.tokenVersion + 1;

    // 5-7. Rotar token y registrar auditoría en una transacción atómica
    // CRÍTICO: Token rotation es una operación de seguridad que debe ser atómica
    await this.prisma.$transaction(async (tx) => {
      // 5a. Incrementar tokenVersion para invalidar tokens anteriores
      await tx.user.update({
        where: { id: user.id },
        data: {
          tokenVersion: newTokenVersion,
          updatedAt: new Date(),
        },
      });

      // 7a. Registrar auditoría de refresh exitoso (dentro de la misma transacción)
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email.getValue(),
          userRole: user.role,
          action: AuditAction.REFRESH_TOKEN,
          resource: AuditResource.AUTH,
          resourceId: user.id,
          resourceName: user.email.getValue(),
          details: { tokenVersion: newTokenVersion },
          success: true,
        },
      });
    });

    // 5b. Invalidate user cache after token rotation (updated tokenVersion)
    await this.cacheService.invalidateUser(user.id);

    // 6. Generar nuevo par de tokens con el nuevo tokenVersion
    const tokens = await this.jwtService.generateTokenPair({
      sub: user.id,
      email: user.email.getValue(),
      role: user.role,
      tokenVersion: newTokenVersion,
    });

    // 8. Retornar nuevos tokens
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
