import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../modules/roles/domain/enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route.
 *
 * Uses role hierarchy - a user with a higher role can access routes
 * requiring lower roles.
 *
 * @example
 * @Roles(Role.ADMIN)
 * @Get('admin-only')
 * async adminRoute() { ... }
 *
 * @example
 * @Roles(Role.MANAGER, Role.THERAPIST)
 * @Get('management')
 * async managementRoute() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
