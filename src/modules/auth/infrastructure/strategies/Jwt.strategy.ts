import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../user/domain/constants/tokens';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IUserRepository } from '../../../user/domain/interfaces/IUserRepository';
import { UserEntity, UserStatus } from '../../../user/domain/entities/User.entity';
import { JwtPayload } from '../services/Jwt.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<UserEntity> {
    // 1. Buscar usuario por ID del payload
    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 2. Verificar que el usuario esté activo
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    // 3. Retornar la entidad de usuario completa
    // Passport automáticamente la adjuntará a req.user
    return user;
  }
}
