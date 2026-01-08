import { ExecutionContext } from '@nestjs/common';
import { CurrentUserFactory } from './current-user.decorator';

describe('CurrentUser Decorator', () => {
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockRequest: { user: { id: string; email: string; role: string } | null };

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      },
    };

    const switchToHttp = jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
    });

    mockExecutionContext = {
      switchToHttp,
    } as unknown as jest.Mocked<ExecutionContext>;
  });

  it('should return full user object when no data parameter', () => {
    const result = CurrentUserFactory(undefined, mockExecutionContext);

    expect(result).toEqual(mockRequest.user);
  });

  it('should return specific user property when data parameter provided', () => {
    const result = CurrentUserFactory('email', mockExecutionContext);

    expect(result).toBe('test@example.com');
  });

  it('should return specific property by key', () => {
    const idResult = CurrentUserFactory('id', mockExecutionContext);
    const roleResult = CurrentUserFactory('role', mockExecutionContext);

    expect(idResult).toBe('user-123');
    expect(roleResult).toBe('admin');
  });

  it('should handle missing user gracefully', () => {
    mockRequest.user = null;

    const result = CurrentUserFactory(undefined, mockExecutionContext);

    expect(result).toBeNull();
  });

  it('should return user object when accessing property on null user', () => {
    mockRequest.user = null;

    const result = CurrentUserFactory('id', mockExecutionContext);

    expect(result).toBeNull();
  });
});
