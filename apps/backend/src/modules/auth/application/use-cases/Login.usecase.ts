import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../user/domain/constants/tokens';
import { IUserRepository } from '../../../user/domain/interfaces/IUserRepository';
import { PasswordService } from '../../../user/infrastructure/services/Password.service';
import { JwtService } from '../../infrastructure/services/Jwt.service';
import { AuditService } from '../../../../shared/audit/audit.service';
import { AuditAction } from '../../../../shared/audit/enums/AuditAction.enum';
import { AuditResource } from '../../../../shared/audit/enums/AuditResource.enum';
import { Email } from '../../../user/domain/value-objects/Email.vo';
import { LoginRequestDto, LoginResponseDto } from '../dtos/Login.dto';
import { UserStatus } from '../../../user/domain/entities/User.entity';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService
  ) {}

  async execute(dto: LoginRequestDto, ipAddress?: string, userAgent?: string): Promise<LoginResponseDto> {
    // 1. Buscar usuario por email
    const email = Email.create(dto.email);
    const user = await this.userRepository.findByEmail(email);

    // SECURITY FIX (P2.5): Prevent timing attack for user enumeration
    // Always perform password verification (even with dummy hash) to maintain constant timing
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$abcdefghijklmnopqrstuvwxyz$hash1234567890abcdefghijklmnopqrstuvwxyz';
    const hashToVerify = user?.passwordHash || dummyHash;

    // Always verify password to prevent timing differences
    const isPasswordValid = user ? await this.passwordService.verify(hashToVerify, dto.password) : false;

    if (!user) {
      // Log failed login - user not found
      await this.auditService.logAuthenticationFailure(
        dto.email,
        AuditAction.LOGIN,
        'Login failed: Invalid credentials (user not found)',
        ipAddress,
        userAgent
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Verificar que el usuario esté activo
    if (user.status === UserStatus.SUSPENDED) {
      // Log failed login - account suspended
      await this.auditService.logAuthenticationFailure(
        user.email.getValue(),
        AuditAction.LOGIN,
        'Login failed: Account is suspended',
        ipAddress,
        userAgent,
        { userId: user.id, status: user.status }
      );
      throw new UnauthorizedException('Account is suspended');
    }

    if (user.status === UserStatus.INVITED) {
      // Log failed login - account not activated
      await this.auditService.logAuthenticationFailure(
        user.email.getValue(),
        AuditAction.LOGIN,
        'Login failed: Account is not activated',
        ipAddress,
        userAgent,
        { userId: user.id, status: user.status }
      );
      throw new UnauthorizedException('Account is not activated yet');
    }

    // 3. Verificar contraseña (already done earlier to prevent timing attack)
    if (!isPasswordValid) {
      // Log failed login - invalid password
      await this.auditService.logAuthenticationFailure(
        user.email.getValue(),
        AuditAction.LOGIN,
        'Login failed: Invalid credentials (wrong password)',
        ipAddress,
        userAgent,
        { userId: user.id }
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Generar tokens
    const tokens = await this.jwtService.generateTokenPair({
      sub: user.id,
      email: user.email.getValue(),
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    // 5. Registrar auditoría de login exitoso
    await this.auditService.log(
      user,
      AuditAction.LOGIN,
      AuditResource.AUTH,
      user.id,
      user.email.getValue(),
      { role: user.role }
    );

    // 6. Retornar respuesta
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email.getValue(),
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
    };
  }
}
