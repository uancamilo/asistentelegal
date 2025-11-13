import { Module } from '@nestjs/common';

// Controller
import { AccountController } from './infrastructure/controllers/Account.controller';

// Use Cases
import { CreateAccountUseCase } from './application/use-cases/CreateAccount/CreateAccount.use-case';
import { ListAccountsUseCase } from './application/use-cases/ListAccounts/ListAccounts.use-case';
import { GetAccountUseCase } from './application/use-cases/GetAccount/GetAccount.use-case';
import { UpdateAccountUseCase } from './application/use-cases/UpdateAccount/UpdateAccount.use-case';
import { DeleteAccountUseCase } from './application/use-cases/DeleteAccount/DeleteAccount.use-case';
import { GetAccountUsersUseCase } from './application/use-cases/GetAccountUsers/GetAccountUsers.use-case';

// Repository
import { ACCOUNT_REPOSITORY } from './domain/constants/tokens';
import { PrismaAccountRepository } from './infrastructure/repositories/PrismaAccount.repository';

// Módulos externos
import { UserModule } from '../user/user.module';
import { AuditModule } from '../../shared/audit/audit.module';
import { RateLimitingModule } from '../../shared/rate-limiting/rate-limiting.module';

@Module({
  imports: [
    UserModule,
    AuditModule,
    RateLimitingModule,
  ],
  controllers: [AccountController],
  providers: [
    // Repository
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: PrismaAccountRepository,
    },
    // Use Cases
    CreateAccountUseCase,
    ListAccountsUseCase,
    GetAccountUseCase,
    UpdateAccountUseCase,
    DeleteAccountUseCase,
    GetAccountUsersUseCase,
  ],
  exports: [
    // Exportar repository por si otros módulos lo necesitan
    ACCOUNT_REPOSITORY,
  ],
})
export class AccountModule {}
