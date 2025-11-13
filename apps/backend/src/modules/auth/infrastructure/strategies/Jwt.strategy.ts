import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../user/domain/constants/tokens';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { IUserRepository } from '../../../user/domain/interfaces/IUserRepository';
import { UserEntity, UserStatus, Role } from '../../../user/domain/entities/User.entity';
import { JwtPayload } from '../services/Jwt.service';
import { AuditService } from '../../../../shared/audit/audit.service';
import { AuditAction } from '../../../../shared/audit/enums/AuditAction.enum';
import { CacheService } from '../../../../shared/cache/cache.service';
import { Email } from '../../../user/domain/value-objects/Email.vo';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(), // Para Postman y clientes API
        (request: Request) => {
          return request?.cookies?.['accessToken']; // Para frontend web con cookies
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
      passReqToCallback: true, // Pass request to validate method
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<UserEntity> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // 1. Check cache first for user data (reduces DB load)
    let user: UserEntity | null = null;
    const cachedData = await this.cacheService.getCachedUser(payload.sub);

    if (cachedData) {
      // Reconstruct UserEntity from cached data
      user = this.deserializeUser(cachedData);
    } else {
      // Cache miss - fetch from database
      user = await this.userRepository.findById(payload.sub);

      if (user) {
        // Cache the user for subsequent requests (TTL: 15min)
        await this.cacheService.cacheUser(payload.sub, this.serializeUser(user));
      }
    }

    if (!user) {
      // Log failed JWT validation - user not found
      await this.auditService.logAuthenticationFailure(
        payload.email,
        AuditAction.ACCESS_DENIED,
        'JWT validation failed: User not found',
        ipAddress,
        userAgent,
        { userId: payload.sub }
      );
      throw new UnauthorizedException('User not found');
    }

    // 2. Verificar que el usuario esté activo
    if (user.status !== UserStatus.ACTIVE) {
      // Log failed JWT validation - user not active
      await this.auditService.logAuthenticationFailure(
        user.email.getValue(),
        AuditAction.ACCESS_DENIED,
        `JWT validation failed: User status is ${user.status}`,
        ipAddress,
        userAgent,
        { userId: user.id, status: user.status }
      );
      throw new UnauthorizedException('User is not active');
    }

    // 3. Verificar que el token no haya sido revocado (token reuse detection)
    if (payload.tokenVersion !== user.tokenVersion) {
      // Log token reuse attempt
      await this.auditService.logAuthenticationFailure(
        user.email.getValue(),
        AuditAction.ACCESS_DENIED,
        'JWT validation failed: Token revoked or reused',
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

    // 4. Retornar la entidad de usuario completa
    // Passport automáticamente la adjuntará a req.user
    return user;
  }

  /**
   * Serialize UserEntity for Redis caching
   * SECURITY (P2.7): passwordHash is NOT cached to reduce attack surface
   * If Redis is compromised, password hashes remain protected in PostgreSQL
   */
  private serializeUser(user: UserEntity): Record<string, any> {
    return {
      id: user.id,
      email: user.email.getValue(),
      // passwordHash: REMOVED - Not needed for JWT validation
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
   * Deserialize cached data back to UserEntity
   * SECURITY (P2.7): passwordHash not in cache, use empty string placeholder
   * JWT validation doesn't need passwordHash - only checks status and tokenVersion
   */
  private deserializeUser(data: Record<string, any>): UserEntity {
    return new UserEntity(
      data['id'],
      Email.create(data['email']),
      '', // passwordHash not cached - empty placeholder (not used in JWT validation)
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
