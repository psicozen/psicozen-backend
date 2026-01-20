import { IBaseRepository } from '../../../../core/domain/repositories/base.repository.interface';
import { UserEntity } from '../entities/user.entity';
import { Role } from '../../../roles/domain/enums/role.enum';

export interface IUserRepository extends IBaseRepository<UserEntity> {
  findByEmail(email: string): Promise<UserEntity | null>;
  findBySupabaseUserId(supabaseUserId: string): Promise<UserEntity | null>;
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Find user by ID including soft-deleted users.
   * Useful for cleanup operations that need to access deleted records.
   */
  findByIdWithDeleted(id: string): Promise<UserEntity | null>;

  /**
   * Get all roles for a user, optionally filtered by organization.
   *
   * @param userId - The user's ID
   * @param organizationId - Optional organization ID. If provided, returns roles
   *                         for that organization plus global roles (e.g., SUPER_ADMIN).
   *                         If not provided, returns only global roles.
   * @returns Array of Role enum values the user has
   */
  getRolesByOrganization(
    userId: string,
    organizationId?: string,
  ): Promise<Role[]>;

  /**
   * Find users by roles in an organization (useful for notifications/alerts).
   *
   * @param organizationId - The organization ID to search within
   * @param roles - Array of Role enum values to search for
   * @returns Array of UserEntity matching any of the specified roles
   */
  findByRoles(organizationId: string, roles: Role[]): Promise<UserEntity[]>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
