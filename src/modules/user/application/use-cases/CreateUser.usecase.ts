import {
  Injectable,
  Inject,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/constants/tokens';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { PasswordService } from '../../infrastructure/services/Password.service';
import { Email } from '../../domain/value-objects/Email.vo';
import { Password } from '../../domain/value-objects/Password.vo';
import { UserEntity, UserStatus, Role } from '../../domain/entities/User.entity';
import { CreateUserRequestDto, CreateUserResponseDto } from '../dtos/CreateUser.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService
  ) {}

  async execute(
    dto: CreateUserRequestDto,
    currentUser: UserEntity
  ): Promise<CreateUserResponseDto> {
    // 1. Verificar que el usuario actual puede crear el rol solicitado
    if (!currentUser.canCreateUser(dto.role)) {
      throw new ForbiddenException(`You are not allowed to create users with role ${dto.role}`);
    }

    // 2. Validar que MEMBER debe tener accountId
    if (dto.role === Role.MEMBER && !dto.accountId) {
      throw new BadRequestException('MEMBER users must have an accountId');
    }

    // 3. Validar que ACCOUNT_OWNER no debe tener accountId (se crea con la cuenta)
    if (dto.role === Role.ACCOUNT_OWNER && dto.accountId) {
      throw new BadRequestException(
        'ACCOUNT_OWNER users should not have an accountId at creation time'
      );
    }

    // 4. Validar que empleados (ADMIN, EDITOR) no deben tener accountId
    if ([Role.ADMIN, Role.EDITOR].includes(dto.role) && dto.accountId !== undefined) {
      throw new BadRequestException('Employee users (ADMIN, EDITOR) should not have an accountId');
    }

    // 5. Verificar que el email no exista
    const email = Email.create(dto.email);
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 6. Validar y hashear la contraseña
    const password = Password.create(dto.password);
    const passwordHash = await this.passwordService.hash(password.getValue());

    // 7. Crear la entidad de usuario
    const userId = this.generateUserId();
    const now = new Date();

    const user = new UserEntity(
      userId,
      email,
      passwordHash,
      dto.firstName,
      dto.lastName,
      dto.role,
      UserStatus.ACTIVE, // Los usuarios creados están activos por defecto
      dto.accountId || null,
      now,
      now
    );

    // 8. Guardar el usuario
    const createdUser = await this.userRepository.create(user);

    // 9. Retornar respuesta
    return {
      id: createdUser.id,
      email: createdUser.email.getValue(),
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
      role: createdUser.role,
      status: createdUser.status,
      accountId: createdUser.accountId,
      createdAt: createdUser.createdAt,
    };
  }

  private generateUserId(): string {
    return randomBytes(16).toString('hex');
  }
}
