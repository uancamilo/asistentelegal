import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ValidateInvitationUseCase } from '../../application/use-cases/ValidateInvitation/ValidateInvitation.use-case';
import { AcceptInvitationUseCase } from '../../application/use-cases/AcceptInvitation/AcceptInvitation.use-case';
import { InviteAccountOwnerUseCase } from '../../application/use-cases/InviteAccountOwner/InviteAccountOwner.use-case';
import { InviteUserUseCase } from '../../application/use-cases/InviteUser/InviteUser.use-case';
import {
  ValidateInvitationValidResponseDto,
  ValidateInvitationInvalidResponseDto,
} from '../../application/use-cases/ValidateInvitation/ValidateInvitation.dto';
import {
  AcceptInvitationRequestDto,
  AcceptInvitationResponseDto,
} from '../../application/use-cases/AcceptInvitation/AcceptInvitation.dto';
import {
  InviteAccountOwnerRequestDto,
  InviteAccountOwnerResponseDto,
} from '../../application/use-cases/InviteAccountOwner/InviteAccountOwner.dto';
import {
  InviteUserRequestDto,
  InviteUserResponseDto,
} from '../../application/use-cases/InviteUser/InviteUser.dto';
import { Public } from '../../../../shared/decorators/public.decorator';
import { Roles } from '../../../../shared/decorators/Roles.decorator';
import { CurrentUser } from '../../../../shared/decorators/CurrentUser.decorator';
import { UserEntity, Role } from '../../../user/domain/entities/User.entity';
import { CuidValidationPipe } from '../../../../shared/pipes/cuid-validation.pipe';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationController {
  constructor(
    private readonly validateInvitationUseCase: ValidateInvitationUseCase,
    private readonly acceptInvitationUseCase: AcceptInvitationUseCase,
    private readonly inviteAccountOwnerUseCase: InviteAccountOwnerUseCase,
    private readonly inviteUserUseCase: InviteUserUseCase
  ) {}

  /**
   * GET /invitations/validate?token={token}
   *
   * Endpoint público para validar un token de invitación
   */
  @Public()
  @Get('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate invitation token',
    description: 'Check if an invitation token is valid and not expired',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Invitation token to validate',
    example: 'uuid-token-here',
  })
  @ApiResponse({
    status: 200,
    description: 'Token validation result',
    type: ValidateInvitationValidResponseDto,
  })
  async validateInvitation(
    @Query('token') token: string
  ): Promise<
    ValidateInvitationValidResponseDto | ValidateInvitationInvalidResponseDto
  > {
    return this.validateInvitationUseCase.execute(token);
  }

  /**
   * POST /invitations/accept
   *
   * Endpoint público para aceptar una invitación y crear el usuario ACCOUNT_OWNER
   */
  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Accept invitation',
    description:
      'Accept an invitation, create ACCOUNT_OWNER user, and activate the account',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation accepted successfully',
    type: AcceptInvitationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered or account already has owner',
  })
  async acceptInvitation(
    @Body() dto: AcceptInvitationRequestDto
  ): Promise<AcceptInvitationResponseDto> {
    return this.acceptInvitationUseCase.execute(dto);
  }

  /**
   * POST /invitations/account-owner/:accountId
   *
   * Endpoint protegido para invitar a un usuario a ser ACCOUNT_OWNER
   * Permisos: SUPER_ADMIN, ADMIN
   */
  @Post('account-owner/:accountId')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Invite user to be account owner',
    description:
      'Send invitation email to a user to become ACCOUNT_OWNER of the specified account. ' +
      'Only SUPER_ADMIN and ADMIN can send owner invitations.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'Unique account ID',
    type: String,
    example: 'acc_clwxyz123',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully',
    type: InviteAccountOwnerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid account ID or request data' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (only SUPER_ADMIN or ADMIN)',
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({
    status: 409,
    description: 'Account already has owner or pending invitation exists or email already registered',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests. Please try again later.',
  })
  async inviteAccountOwner(
    @Param('accountId', CuidValidationPipe) accountId: string,
    @Body() dto: InviteAccountOwnerRequestDto,
    @CurrentUser() currentUser: UserEntity
  ): Promise<InviteAccountOwnerResponseDto> {
    return await this.inviteAccountOwnerUseCase.execute(accountId, dto, currentUser);
  }

  /**
   * POST /invitations/user/:accountId
   *
   * Endpoint protegido para invitar a un usuario a unirse a una cuenta
   * Permisos: SUPER_ADMIN, ADMIN
   */
  @Post('user/:accountId')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Invite user to join account',
    description:
      'Send invitation email to a user to join the account with a specific role. ' +
      'SUPER_ADMIN can invite to any account including EMPLEADOS. ' +
      'ADMIN can only invite to client accounts.',
  })
  @ApiParam({
    name: 'accountId',
    description: 'Unique account ID',
    type: String,
    example: 'acc_clwxyz123',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully',
    type: InviteUserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid account ID or request data' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({
    status: 409,
    description: 'Email already registered or pending invitation exists for this email',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests. Please try again later.',
  })
  async inviteUser(
    @Param('accountId', CuidValidationPipe) accountId: string,
    @Body() dto: InviteUserRequestDto,
    @CurrentUser() currentUser: UserEntity
  ): Promise<InviteUserResponseDto> {
    return await this.inviteUserUseCase.execute(accountId, dto, currentUser);
  }
}
