import { AccountEntity } from '../../modules/account/domain/entities/Account.entity';
import { GetAccountResponseDto } from '../../modules/account/application/use-cases/GetAccount/GetAccount.dto';
import { AccountSummaryDto } from '../../modules/account/application/use-cases/ListAccounts/ListAccounts.dto';

/**
 * Centralized mapper for Account entity to DTO conversions
 *
 * Eliminates duplicated mapping logic (mapToDto, inline mappings) across use cases.
 * Ensures consistent entity-to-DTO transformations throughout the application.
 *
 * Note: GetAccountResponseDto and AccountSummaryDto have identical structure,
 * so a single mapping method serves both purposes.
 */
export class AccountMapper {
  /**
   * Maps an AccountEntity to GetAccountResponseDto
   *
   * @param account - The account entity to map
   * @returns Mapped account DTO
   */
  static toDto(account: AccountEntity): GetAccountResponseDto {
    return {
      id: account.id,
      name: account.name,
      ownerId: account.ownerId,
      createdBy: account.createdBy,
      status: account.status,
      isSystemAccount: account.isSystemAccount,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * Maps an AccountEntity to AccountSummaryDto
   *
   * @param account - The account entity to map
   * @returns Mapped account summary DTO
   */
  static toSummaryDto(account: AccountEntity): AccountSummaryDto {
    return {
      id: account.id,
      name: account.name,
      ownerId: account.ownerId,
      createdBy: account.createdBy,
      status: account.status,
      isSystemAccount: account.isSystemAccount,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
