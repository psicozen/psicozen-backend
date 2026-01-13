import { IBaseRepository } from '../../../../core/domain/repositories/base.repository.interface';
import { Role } from '../../../roles/domain/enums/role.enum';
import { UserEntity } from '../entities/user.entity';

export interface IUserRepository extends IBaseRepository<UserEntity> {
  findByEmail(email: string): Promise<UserEntity | null>;
  findBySupabaseUserId(supabaseUserId: string): Promise<UserEntity | null>;
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Get user roles for a specific organization
   * @param userId - User ID
   * @param organizationId - Organization ID (optional for SUPER_ADMIN global check)
   * @returns Array of Role enum values
   */
  getRolesByOrganization(
    userId: string,
    organizationId?: string,
  ): Promise<Role[]>;

  /**
   * Find users by roles in an organization (for alert notifications)
   * @param organizationId - Organization ID
   * @param roles - Array of Role enum values to search for
   * @returns Array of UserEntity matching the roles
   */
  findByRoles(organizationId: string, roles: Role[]): Promise<UserEntity[]>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
