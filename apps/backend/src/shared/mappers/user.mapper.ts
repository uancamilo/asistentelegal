import { UserEntity } from '../../modules/user/domain/entities/User.entity';
import { GetUserResponseDto } from '../../modules/user/application/dtos/GetUser.dto';

/**
 * Centralized mapper for User entity to DTO conversions
 *
 * Eliminates duplicated toDto() methods across use cases.
 * Ensures consistent entity-to-DTO transformations throughout the application.
 */
export class UserMapper {
  /**
   * Maps a UserEntity to GetUserResponseDto
   *
   * @param user - The user entity to map
   * @returns Mapped user DTO
   */
  static toDto(user: UserEntity): GetUserResponseDto {
    return {
      id: user.id,
      email: user.email.getValue(),
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      accountId: user.accountId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
