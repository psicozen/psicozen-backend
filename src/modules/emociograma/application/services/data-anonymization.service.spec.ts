import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataAnonymizationService } from './data-anonymization.service';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { AUDIT_LOG_SERVICE } from '../../../../core/application/services/audit-log.service.interface';
import type { IAuditLogService } from '../../../../core/application/services/audit-log.service.interface';
import { AuditLogEntity } from '../../../../core/domain/entities/audit-log.entity';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';

/** Helper para criar entidade de audit log mock */
const createMockAuditLogEntity = (action: string): AuditLogEntity => {
  return new AuditLogEntity({
    id: 'log-001',
    action,
    userId: 'user-001',
    organizationId: 'org-001',
    metadata: {},
    createdAt: new Date(),
  });
};

describe('DataAnonymizationService', () => {
  let service: DataAnonymizationService;
  let submissionRepository: jest.Mocked<IEmociogramaSubmissionRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let auditLogService: jest.Mocked<IAuditLogService>;

  const mockUser = new UserEntity({
    id: 'user-001',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  });

  const mockSubmissions = [
    new EmociogramaSubmissionEntity({
      id: 'sub-001',
      organizationId: 'org-001',
      userId: 'user-001',
      emotionLevel: 3,
      emotionEmoji: '😌',
      categoryId: 'cat-001',
      isAnonymous: false,
      comment: 'Feeling good',
      commentFlagged: false,
      submittedAt: new Date('2024-01-15'),
      department: 'Engineering',
      team: 'Backend',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    }),
    new EmociogramaSubmissionEntity({
      id: 'sub-002',
      organizationId: 'org-001',
      userId: 'user-001',
      emotionLevel: 7,
      emotionEmoji: '😢',
      categoryId: 'cat-002',
      isAnonymous: true,
      comment: undefined,
      commentFlagged: false,
      submittedAt: new Date('2024-01-20'),
      department: 'Engineering',
      team: 'Backend',
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
    }),
  ];

  beforeEach(async () => {
    const mockSubmissionRepository: Partial<
      jest.Mocked<IEmociogramaSubmissionRepository>
    > = {
      findByUser: jest.fn(),
      anonymizeByUser: jest.fn(),
      deleteByUser: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockUserRepository: Partial<jest.Mocked<IUserRepository>> = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findBySupabaseUserId: jest.fn(),
      existsByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockAuditLogService: Partial<jest.Mocked<IAuditLogService>> = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataAnonymizationService,
        {
          provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
          useValue: mockSubmissionRepository,
        },
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: AUDIT_LOG_SERVICE, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<DataAnonymizationService>(DataAnonymizationService);
    submissionRepository = module.get(EMOCIOGRAMA_SUBMISSION_REPOSITORY);
    userRepository = module.get(USER_REPOSITORY);
    auditLogService = module.get(AUDIT_LOG_SERVICE);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('anonymizeUserData', () => {
    it('should anonymize user data successfully', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.anonymizeByUser.mockResolvedValue(undefined);
      auditLogService.log.mockResolvedValue(
        createMockAuditLogEntity('user_data_anonymized'),
      );

      const result = await service.anonymizeUserData('user-001', 'org-001');

      expect(userRepository.findById).toHaveBeenCalledWith('user-001');
      expect(submissionRepository.anonymizeByUser).toHaveBeenCalledWith(
        'user-001',
        'org-001',
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user_data_anonymized',
          userId: 'user-001',
          organizationId: 'org-001',
          metadata: expect.objectContaining({
            reason: 'LGPD_compliance',
            article: 'LGPD Art. 18, II',
          }),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Dados do usuário anonimizados com sucesso');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.anonymizeUserData('invalid-user', 'org-001'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.anonymizeUserData('invalid-user', 'org-001'),
      ).rejects.toThrow('Usuário com ID invalid-user não encontrado');

      expect(submissionRepository.anonymizeByUser).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('should log audit entry with LGPD compliance metadata', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.anonymizeByUser.mockResolvedValue(undefined);
      auditLogService.log.mockResolvedValue(
        createMockAuditLogEntity('user_data_anonymized'),
      );

      await service.anonymizeUserData('user-001', 'org-001');

      expect(auditLogService.log).toHaveBeenCalledTimes(1);
      const logCall = auditLogService.log.mock.calls[0][0];
      expect(logCall.metadata?.article).toBe('LGPD Art. 18, II');
    });
  });

  describe('exportUserData', () => {
    it('should export user data successfully', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.findByUser.mockResolvedValue({
        data: mockSubmissions,
        total: 2,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });
      auditLogService.log.mockResolvedValue(
        createMockAuditLogEntity('user_data_anonymized'),
      );

      const result = await service.exportUserData('user-001', 'org-001');

      expect(userRepository.findById).toHaveBeenCalledWith('user-001');
      expect(submissionRepository.findByUser).toHaveBeenCalledWith(
        'user-001',
        'org-001',
        { take: 10000, skip: 0 },
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user_data_exported',
          userId: 'user-001',
          organizationId: 'org-001',
        }),
      );

      // Verify profile data
      expect(result.profile.id).toBe('user-001');
      expect(result.profile.email).toBe('test@example.com');
      expect(result.profile.firstName).toBe('Test');
      expect(result.profile.lastName).toBe('User');
      expect(result.profile.createdAt).toEqual(new Date('2024-01-01'));

      // Verify submissions data
      expect(result.submissions).toHaveLength(2);
      expect(result.submissions[0].emotionLevel).toBe(3);
      expect(result.submissions[0].emotionEmoji).toBe('😌');
      expect(result.submissions[0].categoryId).toBe('cat-001');
      expect(result.submissions[0].comment).toBe('Feeling good');
      expect(result.submissions[0].isAnonymous).toBe(false);
      expect(result.submissions[0].department).toBe('Engineering');
      expect(result.submissions[0].team).toBe('Backend');

      // Verify format
      expect(result.format).toBe('json');
      expect(result.exportedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.exportUserData('invalid-user', 'org-001'),
      ).rejects.toThrow(NotFoundException);

      expect(submissionRepository.findByUser).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('should export empty submissions array when user has no submissions', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.findByUser.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      });
      auditLogService.log.mockResolvedValue(
        createMockAuditLogEntity('user_data_anonymized'),
      );

      const result = await service.exportUserData('user-001', 'org-001');

      expect(result.submissions).toHaveLength(0);
      expect(result.profile.id).toBe('user-001');
    });

    it('should log audit entry with submissions count', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.findByUser.mockResolvedValue({
        data: mockSubmissions,
        total: 2,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });
      auditLogService.log.mockResolvedValue(
        createMockAuditLogEntity('user_data_anonymized'),
      );

      await service.exportUserData('user-001', 'org-001');

      expect(auditLogService.log).toHaveBeenCalledTimes(1);
      const logCall = auditLogService.log.mock.calls[0][0];
      expect(logCall.metadata?.submissionsCount).toBe(2);
      expect(logCall.metadata?.article).toBe('LGPD Art. 18, IV');
    });
  });

  describe('deleteUserData', () => {
    it('should delete user data successfully', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.deleteByUser.mockResolvedValue(undefined);
      auditLogService.log.mockResolvedValue(
        createMockAuditLogEntity('user_data_anonymized'),
      );

      const result = await service.deleteUserData('user-001', 'org-001');

      expect(userRepository.findById).toHaveBeenCalledWith('user-001');
      expect(submissionRepository.deleteByUser).toHaveBeenCalledWith(
        'user-001',
        'org-001',
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user_data_deleted',
          userId: 'user-001',
          organizationId: 'org-001',
          metadata: expect.objectContaining({
            reason: 'LGPD_right_to_erasure',
            article: 'LGPD Art. 18, VI',
          }),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Dados do usuário excluídos permanentemente');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteUserData('invalid-user', 'org-001'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.deleteUserData('invalid-user', 'org-001'),
      ).rejects.toThrow('Usuário com ID invalid-user não encontrado');

      expect(submissionRepository.deleteByUser).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('should log audit entry with LGPD right to erasure metadata', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.deleteByUser.mockResolvedValue(undefined);
      auditLogService.log.mockResolvedValue(
        createMockAuditLogEntity('user_data_anonymized'),
      );

      await service.deleteUserData('user-001', 'org-001');

      expect(auditLogService.log).toHaveBeenCalledTimes(1);
      const logCall = auditLogService.log.mock.calls[0][0];
      expect(logCall.action).toBe('user_data_deleted');
      expect(logCall.metadata?.reason).toBe('LGPD_right_to_erasure');
      expect(logCall.metadata?.article).toBe('LGPD Art. 18, VI');
    });
  });

  describe('LGPD compliance', () => {
    it('should record audit log for all LGPD operations', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.anonymizeByUser.mockResolvedValue(undefined);
      submissionRepository.deleteByUser.mockResolvedValue(undefined);
      submissionRepository.findByUser.mockResolvedValue({
        data: mockSubmissions,
        total: 2,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });
      auditLogService.log.mockResolvedValue(
        createMockAuditLogEntity('user_data_anonymized'),
      );

      // Test all three operations
      await service.anonymizeUserData('user-001', 'org-001');
      await service.exportUserData('user-001', 'org-001');
      await service.deleteUserData('user-001', 'org-001');

      // Verify audit log was called for each operation
      expect(auditLogService.log).toHaveBeenCalledTimes(3);

      const actions = auditLogService.log.mock.calls.map(
        (call) => call[0].action,
      );
      expect(actions).toContain('user_data_anonymized');
      expect(actions).toContain('user_data_exported');
      expect(actions).toContain('user_data_deleted');
    });

    it('should include LGPD article reference in all operations', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      submissionRepository.anonymizeByUser.mockResolvedValue(undefined);
      submissionRepository.deleteByUser.mockResolvedValue(undefined);
      submissionRepository.findByUser.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      });
      auditLogService.log.mockResolvedValue(
        createMockAuditLogEntity('user_data_anonymized'),
      );

      await service.anonymizeUserData('user-001', 'org-001');
      await service.exportUserData('user-001', 'org-001');
      await service.deleteUserData('user-001', 'org-001');

      const articles = auditLogService.log.mock.calls.map(
        (call) => call[0].metadata?.article,
      );
      expect(articles).toContain('LGPD Art. 18, II'); // Anonymization
      expect(articles).toContain('LGPD Art. 18, IV'); // Export (Portability)
      expect(articles).toContain('LGPD Art. 18, VI'); // Deletion (Erasure)
    });
  });
});
