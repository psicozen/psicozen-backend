import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmociogramaController } from './emociograma.controller';
import { SubmitEmociogramaUseCase } from '../../application/use-cases/submit-emociograma.use-case';
import { GetMySubmissionsUseCase } from '../../application/use-cases/get-my-submissions.use-case';
import { GetSubmissionByIdUseCase } from '../../application/use-cases/get-submission-by-id.use-case';
import { ExportEmociogramaUseCase } from '../../application/use-cases/export-emociograma.use-case';
import { SupabaseAuthGuard } from '../../../auth/presentation/guards/supabase-auth.guard';
import { RolesGuard } from '../../../../core/presentation/guards/roles.guard';
import { SubmitEmociogramaDto } from '../../application/dtos/submit-emociograma.dto';
import { ExportQueryDto, ExportFormat } from '../../application/dtos/export-query.dto';
import { PaginationDto } from '../../../../core/application/dtos/pagination.dto';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { Role } from '../../../roles/domain/enums/role.enum';
import type { UserPayload } from '../../../../core/presentation/decorators/current-user.decorator';
import type { PaginatedResult } from '../../../../core/domain/repositories/base.repository.interface';
import type { Response } from 'express';

describe('EmociogramaController', () => {
  let controller: EmociogramaController;
  let submitUseCase: jest.Mocked<SubmitEmociogramaUseCase>;
  let getMySubmissionsUseCase: jest.Mocked<GetMySubmissionsUseCase>;
  let getSubmissionByIdUseCase: jest.Mocked<GetSubmissionByIdUseCase>;
  let exportUseCase: jest.Mocked<ExportEmociogramaUseCase>;

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

    const mockExportUseCase = {
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
        {
          provide: ExportEmociogramaUseCase,
          useValue: mockExportUseCase,
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
    exportUseCase = module.get(ExportEmociogramaUseCase);
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

  describe('exportData', () => {
    const mockResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    const exportQuery: ExportQueryDto = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      format: ExportFormat.CSV,
    };

    const mockExportResult = {
      data: 'Data,Nível Emocional\n2024-01-15,3',
      mimeType: 'text/csv; charset=utf-8',
      filename: 'emociograma_20240115.csv',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('deve exportar dados com sucesso', async () => {
      // Arrange
      exportUseCase.execute.mockResolvedValue(mockExportResult);

      // Act
      await controller.exportData(
        organizationId,
        exportQuery,
        userId,
        Role.ADMIN,
        mockResponse,
      );

      // Assert
      expect(exportUseCase.execute).toHaveBeenCalledWith(
        organizationId,
        exportQuery,
        userId,
        Role.ADMIN,
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        mockExportResult.mimeType,
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="${mockExportResult.filename}"`,
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockExportResult.data);
    });

    it('deve lançar BadRequestException quando organizationId não é fornecido', async () => {
      // Act & Assert
      await expect(
        controller.exportData('', exportQuery, userId, Role.ADMIN, mockResponse),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve exportar dados no formato Excel', async () => {
      // Arrange
      const excelQuery: ExportQueryDto = {
        ...exportQuery,
        format: ExportFormat.EXCEL,
      };
      const excelResult = {
        data: Buffer.from('excel-data'),
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: 'emociograma_20240115.xlsx',
      };
      exportUseCase.execute.mockResolvedValue(excelResult);

      // Act
      await controller.exportData(
        organizationId,
        excelQuery,
        userId,
        Role.ADMIN,
        mockResponse,
      );

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        excelResult.mimeType,
      );
      expect(mockResponse.send).toHaveBeenCalledWith(excelResult.data);
    });

    it('deve usar role GESTOR para exportação', async () => {
      // Arrange
      exportUseCase.execute.mockResolvedValue(mockExportResult);

      // Act
      await controller.exportData(
        organizationId,
        exportQuery,
        userId,
        Role.GESTOR,
        mockResponse,
      );

      // Assert
      expect(exportUseCase.execute).toHaveBeenCalledWith(
        organizationId,
        exportQuery,
        userId,
        Role.GESTOR,
      );
    });

    it('deve propagar erros do use case', async () => {
      // Arrange
      exportUseCase.execute.mockRejectedValue(new Error('Export failed'));

      // Act & Assert
      await expect(
        controller.exportData(
          organizationId,
          exportQuery,
          userId,
          Role.ADMIN,
          mockResponse,
        ),
      ).rejects.toThrow('Export failed');
    });
  });
});
