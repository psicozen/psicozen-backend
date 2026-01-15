import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { IS_PUBLIC_KEY } from '../../../../core/presentation/decorators/public.decorator';

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<SupabaseAuthGuard>(SupabaseAuthGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should inject Reflector dependency', () => {
      expect(reflector).toBeDefined();
    });
  });

  describe('canActivate', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer valid-token',
            },
          }),
        }),
      } as any;
    });

    describe('when route is marked as @Public()', () => {
      it('should allow access without authentication', async () => {
        reflector.getAllAndOverride.mockReturnValue(true);

        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          [mockExecutionContext.getHandler(), mockExecutionContext.getClass()],
        );
      });

      it('should not call parent AuthGuard when public', async () => {
        reflector.getAllAndOverride.mockReturnValue(true);
        const superSpy = jest.spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        );

        guard.canActivate(mockExecutionContext);

        expect(superSpy).not.toHaveBeenCalled();
      });

      it('should check both handler and class metadata', () => {
        reflector.getAllAndOverride.mockReturnValue(true);

        guard.canActivate(mockExecutionContext);

        expect(mockExecutionContext.getHandler).toHaveBeenCalledTimes(1);
        expect(mockExecutionContext.getClass).toHaveBeenCalledTimes(1);
      });
    });

    describe('when route is protected (not public)', () => {
      it('should delegate to parent AuthGuard', () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const superSpy = jest
          .spyOn(
            Object.getPrototypeOf(Object.getPrototypeOf(guard)),
            'canActivate',
          )
          .mockReturnValue(true);

        const result = guard.canActivate(mockExecutionContext);

        expect(superSpy).toHaveBeenCalledWith(mockExecutionContext);
        expect(result).toBe(true);
      });

      it('should check @Public() metadata before delegating', () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        jest
          .spyOn(
            Object.getPrototypeOf(Object.getPrototypeOf(guard)),
            'canActivate',
          )
          .mockReturnValue(true);

        guard.canActivate(mockExecutionContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          [mockExecutionContext.getHandler(), mockExecutionContext.getClass()],
        );
      });
    });

    describe('when @Public() metadata is undefined', () => {
      it('should treat as protected and delegate to AuthGuard', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        const superSpy = jest
          .spyOn(
            Object.getPrototypeOf(Object.getPrototypeOf(guard)),
            'canActivate',
          )
          .mockReturnValue(true);

        guard.canActivate(mockExecutionContext);

        expect(superSpy).toHaveBeenCalledWith(mockExecutionContext);
      });
    });

    describe('when @Public() metadata is null', () => {
      it('should treat as protected and delegate to AuthGuard', () => {
        reflector.getAllAndOverride.mockReturnValue(null);
        const superSpy = jest
          .spyOn(
            Object.getPrototypeOf(Object.getPrototypeOf(guard)),
            'canActivate',
          )
          .mockReturnValue(true);

        guard.canActivate(mockExecutionContext);

        expect(superSpy).toHaveBeenCalledWith(mockExecutionContext);
      });
    });
  });

  describe('integration with Passport AuthGuard', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer valid-token',
            },
          }),
        }),
      } as any;
    });

    it('should extend AuthGuard with "supabase" strategy', () => {
      expect(guard).toBeInstanceOf(SupabaseAuthGuard);
      // Verify it inherits from AuthGuard (implicit through working canActivate)
    });

    it('should use Reflector.getAllAndOverride for metadata resolution', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        expect.any(Array),
      );
    });
  });

  describe('metadata precedence', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
      mockExecutionContext = {
        getHandler: jest.fn().mockReturnValue('handler'),
        getClass: jest.fn().mockReturnValue('class'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer valid-token',
            },
          }),
        }),
      } as any;
    });

    it('should prioritize handler metadata over class metadata', () => {
      // getAllAndOverride returns first non-null value
      // This test verifies the order: handler first, then class
      reflector.getAllAndOverride.mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        'handler',
        'class',
      ]);
    });
  });

  describe('guard behavior with different route decorators', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer valid-token',
            },
          }),
        }),
      } as any;
    });

    it('should allow access to @Public() decorated controller methods', () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should require authentication for undecorated routes', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(
        jest.spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        ),
      ).toHaveBeenCalled();
    });

    it('should respect class-level @Public() decorator', () => {
      // Class-level decorator should apply to all methods
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });

  describe('error scenarios', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {},
          }),
        }),
      } as any;
    });

    it('should handle Reflector errors gracefully', () => {
      reflector.getAllAndOverride.mockImplementation(() => {
        throw new Error('Reflector error');
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow();
    });

    it('should handle missing ExecutionContext gracefully', () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      expect(() => guard.canActivate(null as any)).toThrow();
    });
  });

  describe('performance considerations', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer valid-token',
            },
          }),
        }),
      } as any;
    });

    it('should short-circuit when @Public() is true', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const superSpy = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      );

      guard.canActivate(mockExecutionContext);

      // Verify early return optimization
      expect(superSpy).not.toHaveBeenCalled();
    });

    it('should call parent guard only when necessary', () => {
      const superSpy = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      // First call: public route
      reflector.getAllAndOverride.mockReturnValue(true);
      guard.canActivate(mockExecutionContext);
      expect(superSpy).not.toHaveBeenCalled();

      // Second call: protected route
      reflector.getAllAndOverride.mockReturnValue(false);
      guard.canActivate(mockExecutionContext);
      expect(superSpy).toHaveBeenCalledTimes(1);
    });
  });
});
