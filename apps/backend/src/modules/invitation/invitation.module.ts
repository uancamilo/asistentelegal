import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../shared/email/email.service';

// Repositories
import { PrismaInvitationRepository } from './infrastructure/repositories/PrismaInvitation.repository';
import { INVITATION_REPOSITORY } from './domain/constants/tokens';

// Use Cases
import { InviteAccountOwnerUseCase } from './application/use-cases/InviteAccountOwner/InviteAccountOwner.use-case';
import { ValidateInvitationUseCase } from './application/use-cases/ValidateInvitation/ValidateInvitation.use-case';
import { AcceptInvitationUseCase } from './application/use-cases/AcceptInvitation/AcceptInvitation.use-case';
import { InviteUserUseCase } from './application/use-cases/InviteUser/InviteUser.use-case';

// Controllers
import { InvitationController } from './presentation/controllers/invitation.controller';

// Import AccountModule (clean one-way dependency: Invitation → Account)
import { AccountModule } from '../account/account.module';

@Module({
  imports: [
    AccountModule, // Clean one-way dependency to access AccountRepository
  ],
  controllers: [InvitationController],
  providers: [
    PrismaService,
    EmailService,
    {
      provide: INVITATION_REPOSITORY,
      useClass: PrismaInvitationRepository,
    },
    InviteAccountOwnerUseCase,
    ValidateInvitationUseCase,
    AcceptInvitationUseCase,
    InviteUserUseCase,
  ],
  exports: [
    INVITATION_REPOSITORY,
    InviteAccountOwnerUseCase,
    ValidateInvitationUseCase,
    AcceptInvitationUseCase,
    InviteUserUseCase,
  ],
})
export class InvitationModule {}
