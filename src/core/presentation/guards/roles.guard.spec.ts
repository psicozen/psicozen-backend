import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new RolesGuard(reflector);

    const mockGetRequest = jest.fn();
    mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: mockGetRequest,
      }),
    } as any;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no roles required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow access when roles array is empty', () => {
      reflector.getAllAndOverride.mockReturnValue([]);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', () => {
      const mockRequest = {
        user: { id: 'user-123', role: 'admin' },
      };

      reflector.getAllAndOverride.mockReturnValue(['admin', 'moderator']);
      const mockGetRequest = mockExecutionContext.switchToHttp()
        .getRequest as jest.Mock;
      mockGetRequest.mockReturnValue(mockRequest);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny access when user does not have required role', () => {
      const mockRequest = {
        user: { id: 'user-123', role: 'user' },
      };

      reflector.getAllAndOverride.mockReturnValue(['admin']);
      const mockGetRequest = mockExecutionContext.switchToHttp()
        .getRequest as jest.Mock;
      mockGetRequest.mockReturnValue(mockRequest);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should deny access when user is not present', () => {
      const mockRequest = {};

      reflector.getAllAndOverride.mockReturnValue(['admin']);
      const mockGetRequest = mockExecutionContext.switchToHttp()
        .getRequest as jest.Mock;
      mockGetRequest.mockReturnValue(mockRequest);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should allow access when user has one of multiple required roles', () => {
      const mockRequest = {
        user: { id: 'user-123', role: 'moderator' },
      };

      reflector.getAllAndOverride.mockReturnValue(['admin', 'moderator']);
      const mockGetRequest = mockExecutionContext.switchToHttp()
        .getRequest as jest.Mock;
      mockGetRequest.mockReturnValue(mockRequest);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });
});
