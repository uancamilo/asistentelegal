import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './domain/constants/tokens';
import { UserController } from './interfaces/User.controller';
import { CreateUserUseCase } from './application/use-cases/CreateUser.usecase';
import { GetUserUseCase } from './application/use-cases/GetUser.usecase';
import { ListUsersUseCase } from './application/use-cases/ListUsers.usecase';
import { PasswordService } from './infrastructure/services/Password.service';
import { PrismaUserRepository } from './infrastructure/repositories/PrismaUser.repository';

@Module({
  controllers: [UserController],
  providers: [
    // Use Cases
    CreateUserUseCase,
    GetUserUseCase,
    ListUsersUseCase,
    // Services
    PasswordService,
    // Repositories
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [USER_REPOSITORY, PasswordService, CreateUserUseCase, GetUserUseCase, ListUsersUseCase],
})
export class UserModule {}
