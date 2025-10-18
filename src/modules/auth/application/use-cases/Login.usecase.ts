import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../user/domain/interfaces/IUserRepository';
import { IUserRepository } from '../../../user/domain/interfaces/IUserRepository';
import { PasswordService } from '../../../user/infrastructure/services/Password.service';
import { JwtService } from '../../infrastructure/services/Jwt.service';
import { Email } from '../../../user/domain/value-objects/Email.vo';
import { LoginRequestDto, LoginResponseDto } from '../dtos/Login.dto';
import { UserStatus } from '../../../user/domain/entities/User.entity';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService
  ) {}

  async execute(dto: LoginRequestDto): Promise<LoginResponseDto> {
    // 1. Buscar usuario por email
    const email = Email.create(dto.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Verificar que el usuario esté activo
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    if (user.status === UserStatus.INVITED) {
      throw new UnauthorizedException('Account is not activated yet');
    }

    // 3. Verificar contraseña
    const isPasswordValid = await this.passwordService.verify(user.passwordHash, dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Generar tokens
    const tokens = await this.jwtService.generateTokenPair({
      sub: user.id,
      email: user.email.getValue(),
      role: user.role,
    });

    // 5. Retornar respuesta
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
