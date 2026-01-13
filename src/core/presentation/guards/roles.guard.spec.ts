import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../../modules/roles/domain/enums/role.enum';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../modules/users/domain/repositories/user.repository.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let userRepository: jest.Mocked<IUserRepository>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockGetRequest: jest.Mock;

  const createMockContext = (user?: any, headers?: Record<string, string>) => {
    mockGetRequest.mockReturnValue({
      user,
      headers: headers || {},
    });
    return mockExecutionContext;
  };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    userRepository = {
      getRolesByOrganization: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findBySupabaseUserId: jest.fn(),
      existsByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockGetRequest = jest.fn();
    mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: mockGetRequest,
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: reflector },
        { provide: USER_REPOSITORY, useValue: userRepository },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    describe('when no roles required', () => {
      it('should allow access when roles are undefined', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        createMockContext({ id: 'user-123' });

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(userRepository.getRolesByOrganization).not.toHaveBeenCalled();
      });

      it('should allow access when roles array is empty', async () => {
        reflector.getAllAndOverride.mockReturnValue([]);
        createMockContext({ id: 'user-123' });

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(userRepository.getRolesByOrganization).not.toHaveBeenCalled();
      });
    });

    describe('when user is not authenticated', () => {
      it('should deny access when user is undefined', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
        createMockContext(undefined);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(false);
      });

      it('should deny access when user is null', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
        createMockContext(null);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(false);
      });
    });

    describe('SUPER_ADMIN behavior', () => {
      it('should allow SUPER_ADMIN access without organization ID', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
        createMockContext({ id: 'user-123' }, {});
        userRepository.getRolesByOrganization.mockResolvedValue([
          Role.SUPER_ADMIN,
        ]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(userRepository.getRolesByOrganization).toHaveBeenCalledWith(
          'user-123',
          undefined,
        );
      });

      it('should allow SUPER_ADMIN access to any route requiring any role', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.OWNER]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([
          Role.SUPER_ADMIN,
        ]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });
    });

    describe('organization context required', () => {
      it('should deny access for non-SUPER_ADMIN without organization ID', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
        createMockContext({ id: 'user-123' }, {});
        userRepository.getRolesByOrganization.mockResolvedValue([Role.ADMIN]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(false);
      });

      it('should allow access when user has required role in organization', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([Role.ADMIN]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(userRepository.getRolesByOrganization).toHaveBeenCalledWith(
          'user-123',
          'org-123',
        );
      });

      it('should pass organization ID to repository', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
        createMockContext(
          { id: 'user-456' },
          { 'x-organization-id': 'org-789' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([Role.MEMBER]);

        await guard.canActivate(mockExecutionContext);

        expect(userRepository.getRolesByOrganization).toHaveBeenCalledWith(
          'user-456',
          'org-789',
        );
      });
    });

    describe('role hierarchy', () => {
      it('should allow access when user has higher role than required', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([Role.ADMIN]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should allow access when user has equal role to required', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.MANAGER]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([Role.MANAGER]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should deny access when user has lower role than required', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([Role.MEMBER]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(false);
      });

      it('should allow OWNER to access ADMIN routes', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([Role.OWNER]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should deny VIEWER access to THERAPIST routes', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.THERAPIST]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([Role.VIEWER]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(false);
      });
    });

    describe('multiple required roles', () => {
      it('should allow access if user has any one of multiple required roles', async () => {
        reflector.getAllAndOverride.mockReturnValue([
          Role.ADMIN,
          Role.THERAPIST,
        ]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([
          Role.THERAPIST,
        ]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should allow access if user has higher role than any required', async () => {
        reflector.getAllAndOverride.mockReturnValue([
          Role.MANAGER,
          Role.THERAPIST,
        ]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([Role.ADMIN]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should deny access if user has lower role than all required', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.MANAGER]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([Role.MEMBER]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(false);
      });
    });

    describe('multiple user roles', () => {
      it('should check all user roles against requirements', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([
          Role.MEMBER,
          Role.THERAPIST,
          Role.ADMIN,
        ]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should use highest user role for hierarchy check', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.MANAGER]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([
          Role.VIEWER,
          Role.ADMIN, // This should grant access
        ]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty user roles array', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(false);
      });

      it('should handle user not in organization', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([]);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(false);
      });

      it('should correctly use reflector to get roles metadata', async () => {
        reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
        createMockContext(
          { id: 'user-123' },
          { 'x-organization-id': 'org-123' },
        );
        userRepository.getRolesByOrganization.mockResolvedValue([Role.ADMIN]);

        await guard.canActivate(mockExecutionContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
      });
    });
  });
});
