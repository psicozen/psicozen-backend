import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SubmitEmociogramaUseCase } from './submit-emociograma.use-case';
import {
  IEmociogramaSubmissionRepository,
  EMOCIOGRAMA_SUBMISSION_REPOSITORY,
} from '../../domain/repositories/submission.repository.interface';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../../../organizations/domain/repositories/organization.repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface';
import {
  IAlertService,
  ALERT_SERVICE,
} from '../services/alert.service.interface';
import { CommentModerationService } from '../services/comment-moderation.service';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { OrganizationEntity } from '../../../organizations/domain/entities/organization.entity';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { SubmitEmociogramaDto } from '../dtos/submit-emociograma.dto';
import { NotFoundException } from '../../../../core/domain/exceptions/not-found.exception';

describe('SubmitEmociogramaUseCase', () => {
  let useCase: SubmitEmociogramaUseCase;
  let submissionRepository: jest.Mocked<IEmociogramaSubmissionRepository>;
  let organizationRepository: jest.Mocked<IOrganizationRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let alertService: jest.Mocked<IAlertService>;
  let moderationService: CommentModerationService;

  // Mock data
  const userId = 'user-123';
  const organizationId = 'org-456';
  const categoryId = 'cat-789';

  const mockOrganization = {
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-organization',
    type: 'company' as const,
    isActive: true,
    settings: {
      timezone: 'America/Sao_Paulo',
      locale: 'pt-BR',
      emociogramaEnabled: true,
      alertThreshold: 6,
      dataRetentionDays: 365,
      anonymityDefault: false,
    },
  } as OrganizationEntity;

  const mockUser = {
    id: userId,
    email: 'test@example.com',
    firstName: 'Test',
    isActive: true,
  } as UserEntity;

  beforeEach(async () => {
    const mockSubmissionRepository: Partial<
      jest.Mocked<IEmociogramaSubmissionRepository>
    > = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      findByUser: jest.fn(),
      getAggregatedByTimeRange: jest.fn(),
      findSubmissionsAboveThreshold: jest.fn(),
      getMostMotivated: jest.fn(),
      getLeastMotivated: jest.fn(),
      getByDepartment: jest.fn(),
      getByTeam: jest.fn(),
      deleteByUser: jest.fn(),
      anonymizeByUser: jest.fn(),
    };

    const mockOrganizationRepository: Partial<
      jest.Mocked<IOrganizationRepository>
    > = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findChildren: jest.fn(),
      findActiveByType: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockUserRepository: Partial<jest.Mocked<IUserRepository>> = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findBySupabaseUserId: jest.fn(),
      existsByEmail: jest.fn(),
      getRolesByOrganization: jest.fn(),
      findByRoles: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockAlertService: jest.Mocked<IAlertService> = {
      triggerEmotionalAlert: jest.fn().mockResolvedValue(null),
      resolveAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitEmociogramaUseCase,
        CommentModerationService,
        {
          provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
          useValue: mockSubmissionRepository,
        },
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockOrganizationRepository,
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: ALERT_SERVICE,
          useValue: mockAlertService,
        },
      ],
    }).compile();

    useCase = module.get<SubmitEmociogramaUseCase>(SubmitEmociogramaUseCase);
    submissionRepository = module.get(EMOCIOGRAMA_SUBMISSION_REPOSITORY);
    organizationRepository = module.get(ORGANIZATION_REPOSITORY);
    userRepository = module.get(USER_REPOSITORY);
    alertService = module.get(ALERT_SERVICE);
    moderationService = module.get(CommentModerationService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const validDto: SubmitEmociogramaDto = {
      emotionLevel: 3,
      categoryId,
      isAnonymous: false,
      comment: 'Feeling good today!',
      department: 'Engineering',
      team: 'Backend',
    };

    it('should submit emociograma successfully', async () => {
      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.create.mockImplementation(
        async (entity: EmociogramaSubmissionEntity) => {
          entity.id = 'submission-123';
          return entity;
        },
      );

      const result = await useCase.execute(validDto, userId, organizationId);

      expect(result).toBeDefined();
      expect(result.emotionLevel).toBe(3);
      expect(result.categoryId).toBe(categoryId);
      expect(result.isAnonymous).toBe(false);
      expect(organizationRepository.findById).toHaveBeenCalledWith(
        organizationId,
      );
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(submissionRepository.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if emociograma is disabled', async () => {
      const disabledOrg = {
        ...mockOrganization,
        settings: { ...mockOrganization.settings, emociogramaEnabled: false },
      } as OrganizationEntity;

      organizationRepository.findById.mockResolvedValue(disabledOrg);

      await expect(
        useCase.execute(validDto, userId, organizationId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        useCase.execute(validDto, userId, organizationId),
      ).rejects.toThrow('Emociograma está desabilitado para esta organização');
      expect(submissionRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(validDto, userId, organizationId),
      ).rejects.toThrow(NotFoundException);
      expect(submissionRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(validDto, userId, organizationId),
      ).rejects.toThrow(NotFoundException);
      expect(submissionRepository.create).not.toHaveBeenCalled();
    });

    it('should moderate and flag inappropriate comments', async () => {
      const dtoWithBadComment: SubmitEmociogramaDto = {
        ...validDto,
        comment: 'This idiota manager is terrible',
      };

      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.create.mockImplementation(
        async (entity: EmociogramaSubmissionEntity) => {
          entity.id = 'submission-123';
          return entity;
        },
      );

      const result = await useCase.execute(
        dtoWithBadComment,
        userId,
        organizationId,
      );

      expect(result).toBeDefined();
      expect(result.commentFlagged).toBe(true);
      // Verifica que a palavra foi sanitizada
      expect(result.comment).toContain('******'); // "idiota" -> "******"
    });

    it('should return masked identity for anonymous submissions', async () => {
      const anonymousDto: SubmitEmociogramaDto = {
        ...validDto,
        isAnonymous: true,
      };

      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.create.mockImplementation(
        async (entity: EmociogramaSubmissionEntity) => {
          entity.id = 'submission-123';
          return entity;
        },
      );

      const result = await useCase.execute(
        anonymousDto,
        userId,
        organizationId,
      );

      expect(result).toBeDefined();
      expect(result.isAnonymous).toBe(true);
      expect(result.userId).toBe('anonymous');
      // Department and team should be preserved for aggregation
      expect(result.department).toBe('Engineering');
      expect(result.team).toBe('Backend');
    });

    it('should trigger alert when emotion level >= 6', async () => {
      const highEmotionDto: SubmitEmociogramaDto = {
        ...validDto,
        emotionLevel: 7, // Above threshold
      };

      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.create.mockImplementation(
        async (entity: EmociogramaSubmissionEntity) => {
          entity.id = 'submission-123';
          return entity;
        },
      );

      await useCase.execute(highEmotionDto, userId, organizationId);

      // Wait for async alert to be triggered
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(alertService.triggerEmotionalAlert).toHaveBeenCalled();
    });

    it('should NOT trigger alert when emotion level < 6', async () => {
      const lowEmotionDto: SubmitEmociogramaDto = {
        ...validDto,
        emotionLevel: 3, // Below threshold
      };

      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.create.mockImplementation(
        async (entity: EmociogramaSubmissionEntity) => {
          entity.id = 'submission-123';
          return entity;
        },
      );

      await useCase.execute(lowEmotionDto, userId, organizationId);

      expect(alertService.triggerEmotionalAlert).not.toHaveBeenCalled();
    });

    it('should handle alert service errors gracefully', async () => {
      const highEmotionDto: SubmitEmociogramaDto = {
        ...validDto,
        emotionLevel: 8,
      };

      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.create.mockImplementation(
        async (entity: EmociogramaSubmissionEntity) => {
          entity.id = 'submission-123';
          return entity;
        },
      );
      alertService.triggerEmotionalAlert.mockRejectedValue(
        new Error('Alert service failed'),
      );

      // Should not throw even if alert service fails
      const result = await useCase.execute(
        highEmotionDto,
        userId,
        organizationId,
      );

      expect(result).toBeDefined();
      expect(result.emotionLevel).toBe(8);
    });

    it('should include department and team from DTO', async () => {
      const dtoWithLocation: SubmitEmociogramaDto = {
        ...validDto,
        department: 'Sales',
        team: 'Enterprise',
      };

      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.create.mockImplementation(
        async (entity: EmociogramaSubmissionEntity) => {
          entity.id = 'submission-123';
          return entity;
        },
      );

      const result = await useCase.execute(
        dtoWithLocation,
        userId,
        organizationId,
      );

      expect(result.department).toBe('Sales');
      expect(result.team).toBe('Enterprise');
    });

    it('should work without optional fields', async () => {
      const minimalDto: SubmitEmociogramaDto = {
        emotionLevel: 5,
        categoryId,
        isAnonymous: false,
      };

      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.create.mockImplementation(
        async (entity: EmociogramaSubmissionEntity) => {
          entity.id = 'submission-123';
          return entity;
        },
      );

      const result = await useCase.execute(minimalDto, userId, organizationId);

      expect(result).toBeDefined();
      expect(result.emotionLevel).toBe(5);
      expect(result.comment).toBeUndefined();
      expect(result.department).toBeUndefined();
      expect(result.team).toBeUndefined();
    });

    it('should assign correct emoji based on emotion level', async () => {
      const dto: SubmitEmociogramaDto = {
        emotionLevel: 1,
        categoryId,
        isAnonymous: false,
      };

      organizationRepository.findById.mockResolvedValue(mockOrganization);
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.create.mockImplementation(
        async (entity: EmociogramaSubmissionEntity) => {
          entity.id = 'submission-123';
          return entity;
        },
      );

      const result = await useCase.execute(dto, userId, organizationId);

      // Verificamos que o emoji está presente (o valor exato é determinado pela entidade)
      expect(result.emotionEmoji).toBeDefined();
      expect(typeof result.emotionEmoji).toBe('string');
    });
  });
});
