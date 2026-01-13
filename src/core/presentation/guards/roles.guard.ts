import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  Role,
  hasHigherRole,
} from '../../../modules/roles/domain/enums/role.enum';
import type { IUserRepository } from '../../../modules/users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../modules/users/domain/repositories/user.repository.interface';

/**
 * Guard that checks if the authenticated user has the required roles.
 *
 * Features:
 * - Organization-scoped role checking via x-organization-id header
 * - Role hierarchy support (higher roles can access lower role routes)
 * - SUPER_ADMIN bypasses organization checks
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(Role.ADMIN)
 * async protectedRoute() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JwtAuthGuard
    const organizationId = request.headers['x-organization-id'] as string;

    // User must be authenticated
    if (!user) {
      return false;
    }

    // Get user roles for the organization (or global roles if no org)
    const userRoles = await this.userRepository.getRolesByOrganization(
      user.id,
      organizationId,
    );

    // SUPER_ADMIN bypasses organization checks
    if (userRoles.includes(Role.SUPER_ADMIN)) {
      return true;
    }

    // For other roles, organization ID is required
    if (!organizationId) {
      return false;
    }

    // Check if user has any of the required roles with sufficient hierarchy
    return requiredRoles.some((requiredRole) =>
      userRoles.some((userRole) => hasHigherRole(userRole, requiredRole)),
    );
  }
}
