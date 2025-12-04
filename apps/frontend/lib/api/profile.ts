import apiClient from './client'
import type { UserProfile, AccountData, CompleteProfile } from '../types'

// Re-export types for backward compatibility
export type { UserProfile, AccountData, CompleteProfile }

/**
 * Get current user's profile
 * Endpoint: GET /users/me
 */
export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/users/me')
  return response.data
}

/**
 * Get account data by ID
 * Endpoint: GET /accounts/:id
 */
export const getAccountById = async (accountId: string): Promise<AccountData> => {
  const response = await apiClient.get<AccountData>(`/accounts/${accountId}`)
  return response.data
}

/**
 * Get complete profile with user and account data
 * This combines /users/me + /accounts/:id
 *
 * Note: Only SUPER_ADMIN, ADMIN, and ACCOUNT_OWNER can access account details.
 * EDITOR and MEMBER roles will not have account data.
 */
export const getCompleteProfile = async (): Promise<CompleteProfile> => {
  // 1. Get user profile
  const user = await getMyProfile()

  // 2. Get account data only if user has permission
  // Only SUPER_ADMIN, ADMIN, and ACCOUNT_OWNER can access /accounts/:id
  const canAccessAccountEndpoint = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_OWNER'].includes(user.role)

  let account: AccountData | null = null
  if (user.accountId && canAccessAccountEndpoint) {
    try {
      account = await getAccountById(user.accountId)
    } catch {
      // Continue without account data
    }
  }

  return {
    user,
    account,
  }
}
