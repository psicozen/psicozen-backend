import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmociogramaController } from './emociograma.controller';
import { SubmitEmociogramaUseCase } from '../../application/use-cases/submit-emociograma.use-case';
import { GetMySubmissionsUseCase } from '../../application/use-cases/get-my-submissions.use-case';
import { GetSubmissionByIdUseCase } from '../../application/use-cases/get-submission-by-id.use-case';
import { SupabaseAuthGuard } from '../../../auth/presentation/guards/supabase-auth.guard';
import { RolesGuard } from '../../../../core/presentation/guards/roles.guard';
import { SubmitEmociogramaDto } from '../../application/dtos/submit-emociograma.dto';
import { PaginationDto } from '../../../../core/application/dtos/pagination.dto';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { Role } from '../../../roles/domain/enums/role.enum';
import type { UserPayload } from '../../../../core/presentation/decorators/current-user.decorator';
import type { PaginatedResult } from '../../../../core/domain/repositories/base.repository.interface';

describe('EmociogramaController', () => {
  let controller: EmociogramaController;
  let submitUseCase: jest.Mocked<SubmitEmociogramaUseCase>;
  let getMySubmissionsUseCase: jest.Mocked<GetMySubmissionsUseCase>;
  let getSubmissionByIdUseCase: jest.Mocked<GetSubmissionByIdUseCase>;

  // Mock data
  const userId = 'user-123';
  const organizationId = 'org-456';

  const mockSubmission = {
    id: 'sub-001',
    organizationId,
    userId,
    emotionLevel: 3,
    emotionEmoji: '😌',
    categoryId: 'cat-789',
    isAnonymous: false,
    comment: 'Feeling good today',
    commentFlagged: false,
    submittedAt: new Date('2024-01-15T10:00:00Z'),
    department: 'Engineering',
    team: 'Backend',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  } as EmociogramaSubmissionEntity;

  const mockUserPayload: UserPayload = {
    id: userId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: Role.COLABORADOR,
  };

  beforeEach(async () => {
    const mockSubmitUseCase = {
      execute: jest.fn(),
    };

    const mockGetMySubmissionsUseCase = {
      execute: jest.fn(),
    };

    const mockGetSubmissionByIdUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmociogramaController],
      providers: [
        { provide: SubmitEmociogramaUseCase, useValue: mockSubmitUseCase },
        {
          provide: GetMySubmissionsUseCase,
          useValue: mockGetMySubmissionsUseCase,
        },
        {
          provide: GetSubmissionByIdUseCase,
          useValue: mockGetSubmissionByIdUseCase,
        },
        Reflector,
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmociogramaController>(EmociogramaController);
    submitUseCase = module.get(SubmitEmociogramaUseCase);
    getMySubmissionsUseCase = module.get(GetMySubmissionsUseCase);
    getSubmissionByIdUseCase = module.get(GetSubmissionByIdUseCase);
  });

  describe('submit', () => {
    const submitDto: SubmitEmociogramaDto = {
      emotionLevel: 3,
      categoryId: 'cat-789',
      isAnonymous: false,
      comment: 'Feeling good today',
    };

    it('deve criar submissão com sucesso', async () => {
      // Arrange
      submitUseCase.execute.mockResolvedValue(mockSubmission);

      // Act
      const result = await controller.submit(submitDto, userId, organizationId);

      // Assert
      expect(submitUseCase.execute).toHaveBeenCalledWith(
        submitDto,
        userId,
        organizationId,
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSubmission);
    });

    it('deve lançar BadRequestException quando organizationId não é fornecido', async () => {
      // Act & Assert
      await expect(controller.submit(submitDto, userId, '')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.submit(submitDto, userId, '')).rejects.toThrow(
        'Header x-organization-id é obrigatório',
      );
    });

    it('deve propagar erros do use case', async () => {
      // Arrange
      submitUseCase.execute.mockRejectedValue(
        new Error('Emociograma desabilitado'),
      );

      // Act & Assert
      await expect(
        controller.submit(submitDto, userId, organizationId),
      ).rejects.toThrow('Emociograma desabilitado');
    });
  });

  describe('getMySubmissions', () => {
    const pagination = new PaginationDto();

    const mockPaginatedResult: PaginatedResult<EmociogramaSubmissionEntity> = {
      data: [mockSubmission],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    it('deve retornar submissões paginadas do usuário', async () => {
      // Arrange
      getMySubmissionsUseCase.execute.mockResolvedValue(mockPaginatedResult);

      // Act
      const result = await controller.getMySubmissions(
        userId,
        organizationId,
        pagination,
      );

      // Assert
      expect(getMySubmissionsUseCase.execute).toHaveBeenCalledWith(
        userId,
        organizationId,
        pagination,
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockSubmission]);
      expect(result.meta).toBeDefined();
      expect(result.meta?.total).toBe(1);
      expect(result.meta?.page).toBe(1);
    });

    it('deve lançar BadRequestException quando organizationId não é fornecido', async () => {
      // Act & Assert
      await expect(
        controller.getMySubmissions(userId, '', pagination),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSubmissionById', () => {
    it('deve retornar submissão específica', async () => {
      // Arrange
      getSubmissionByIdUseCase.execute.mockResolvedValue(mockSubmission);

      // Act
      const result = await controller.getSubmissionById(
        mockSubmission.id,
        mockUserPayload,
        organizationId,
      );

      // Assert
      expect(getSubmissionByIdUseCase.execute).toHaveBeenCalledWith(
        mockSubmission.id,
        mockUserPayload.id,
        organizationId,
        mockUserPayload.role,
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSubmission);
    });

    it('deve lançar BadRequestException quando organizationId não é fornecido', async () => {
      // Act & Assert
      await expect(
        controller.getSubmissionById(mockSubmission.id, mockUserPayload, ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve passar role do usuário para o use case', async () => {
      // Arrange
      const adminUser: UserPayload = {
        ...mockUserPayload,
        role: Role.ADMIN,
      };
      getSubmissionByIdUseCase.execute.mockResolvedValue(mockSubmission);

      // Act
      await controller.getSubmissionById(
        mockSubmission.id,
        adminUser,
        organizationId,
      );

      // Assert
      expect(getSubmissionByIdUseCase.execute).toHaveBeenCalledWith(
        mockSubmission.id,
        adminUser.id,
        organizationId,
        Role.ADMIN,
      );
    });
  });
});
