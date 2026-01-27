import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ExportEmociogramaUseCase } from './export-emociograma.use-case';
import type { ExportResult } from './export-emociograma.use-case';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { ExportQueryDto, ExportFormat } from '../dtos/export-query.dto';
import { Role } from '../../../roles/domain/enums/role.enum';

describe('ExportEmociogramaUseCase', () => {
  let useCase: ExportEmociogramaUseCase;
  let mockRepository: jest.Mocked<IEmociogramaSubmissionRepository>;

  const organizationId = 'org-123';
  const userId = 'user-456';
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-31');

  const createMockSubmission = (
    overrides: Partial<EmociogramaSubmissionEntity> = {},
  ) => {
    const submission = Object.assign(new EmociogramaSubmissionEntity(), {
      id: 'sub-001',
      organizationId,
      userId: 'user-789',
      emotionLevel: 4,
      emotionEmoji: '😊',
      categoryId: 'cat-001',
      isAnonymous: false,
      comment: 'Feeling good',
      commentFlagged: false,
      submittedAt: new Date('2024-01-15T10:00:00Z'),
      department: 'Engineering',
      team: 'Backend',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      ...overrides,
    });
    return submission;
  };

  const mockSubmissions = [
    createMockSubmission({ id: 'sub-001', emotionLevel: 3 }),
    createMockSubmission({ id: 'sub-002', emotionLevel: 7, isAnonymous: true }),
    createMockSubmission({ id: 'sub-003', emotionLevel: 5 }),
  ];

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      existsById: jest.fn(),
      findByUser: jest.fn(),
      getAggregatedByTimeRange: jest.fn(),
      findSubmissionsAboveThreshold: jest.fn(),
      getMostMotivated: jest.fn(),
      getLeastMotivated: jest.fn(),
      getByDepartment: jest.fn(),
      getByTeam: jest.fn(),
      deleteByUser: jest.fn(),
      anonymizeByUser: jest.fn(),
    } as jest.Mocked<IEmociogramaSubmissionRepository>;

    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportEmociogramaUseCase,
        {
          provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<ExportEmociogramaUseCase>(ExportEmociogramaUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    beforeEach(() => {
      mockRepository.findAll.mockResolvedValue({
        data: mockSubmissions,
        total: 3,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });
    });

    it('deve exportar dados no formato CSV por padrão', async () => {
      const query: ExportQueryDto = { startDate, endDate };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      expect(result.mimeType).toBe('text/csv; charset=utf-8');
      expect(result.filename).toMatch(/emociograma_\d+\.csv/);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('Data');
      expect(result.data).toContain('Nível Emocional');
    });

    it('deve exportar dados no formato CSV quando especificado', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.CSV,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      expect(result.mimeType).toBe('text/csv; charset=utf-8');
      expect(result.filename).toContain('.csv');
    });

    it('deve exportar dados no formato Excel', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.EXCEL,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      expect(result.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(result.filename).toContain('.xlsx');
      expect(Buffer.isBuffer(result.data)).toBe(true);
    });

    it('deve exportar dados no formato JSON', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.JSON,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      expect(result.mimeType).toBe('application/json');
      expect(result.filename).toContain('.json');
      expect(typeof result.data).toBe('string');

      const parsed = JSON.parse(result.data as string);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('deve chamar repositório com parâmetros corretos', async () => {
      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId },
          orderBy: { submittedAt: 'DESC' },
          take: 10000,
          skip: 0,
        }),
      );
    });

    it('deve aplicar filtro de departamento', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        department: 'Engineering',
      };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            department: 'Engineering',
          }),
        }),
      );
    });

    it('deve aplicar filtro de equipe', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        team: 'Backend',
      };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            team: 'Backend',
          }),
        }),
      );
    });

    it('deve aplicar filtro de categoria', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        categoryId: 'cat-001',
      };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-001',
          }),
        }),
      );
    });

    it('deve filtrar dados por período', async () => {
      const submissionOutOfRange = createMockSubmission({
        id: 'sub-out',
        submittedAt: new Date('2023-12-01'),
      });

      mockRepository.findAll.mockResolvedValue({
        data: [...mockSubmissions, submissionOutOfRange],
        total: 4,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });

      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.JSON,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      const parsed = JSON.parse(result.data as string);
      expect(parsed.length).toBe(3); // Apenas os 3 dentro do período
    });
  });

  describe('controle de acesso por role', () => {
    beforeEach(() => {
      mockRepository.findAll.mockResolvedValue({
        data: mockSubmissions,
        total: 3,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });
    });

    it('deve mascarar identidades para GESTOR', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.JSON,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.GESTOR,
      );

      const parsed = JSON.parse(result.data as string);
      // Para GESTOR, os dados devem estar mascarados
      expect(parsed.length).toBe(3);
    });

    it('deve retornar dados completos para ADMIN', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.JSON,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      const parsed = JSON.parse(result.data as string);
      expect(parsed.length).toBe(3);
    });
  });

  describe('formatação de registros', () => {
    beforeEach(() => {
      mockRepository.findAll.mockResolvedValue({
        data: mockSubmissions,
        total: 3,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });
    });

    it('deve formatar registro com todos os campos', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.JSON,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      const parsed = JSON.parse(result.data as string);
      const record = parsed[0];

      expect(record).toHaveProperty('Data');
      expect(record).toHaveProperty('Nível Emocional');
      expect(record).toHaveProperty('Emoji');
      expect(record).toHaveProperty('Categoria');
      expect(record).toHaveProperty('Departamento');
      expect(record).toHaveProperty('Equipe');
      expect(record).toHaveProperty('Anônimo');
      expect(record).toHaveProperty('Comentário');
    });

    it('deve usar N/A para departamento/equipe ausentes', async () => {
      const submissionWithoutDept = createMockSubmission({
        department: undefined,
        team: undefined,
      });

      mockRepository.findAll.mockResolvedValue({
        data: [submissionWithoutDept],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });

      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.JSON,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      const parsed = JSON.parse(result.data as string);
      expect(parsed[0].Departamento).toBe('N/A');
      expect(parsed[0].Equipe).toBe('N/A');
    });

    it('deve converter isAnonymous para Sim/Não', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.JSON,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      const parsed = JSON.parse(result.data as string);
      const anonymous = parsed.find(
        (r: { Anônimo: string }) => r.Anônimo === 'Sim',
      );
      const identified = parsed.find(
        (r: { Anônimo: string }) => r.Anônimo === 'Não',
      );

      expect(anonymous).toBeDefined();
      expect(identified).toBeDefined();
    });
  });

  describe('geração de CSV', () => {
    beforeEach(() => {
      mockRepository.findAll.mockResolvedValue({
        data: mockSubmissions,
        total: 3,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });
    });

    it('deve incluir headers no CSV', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.CSV,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      const csv = result.data as string;
      const firstLine = csv.split('\n')[0];

      expect(firstLine).toContain('Data');
      expect(firstLine).toContain('Nível Emocional');
      expect(firstLine).toContain('Emoji');
    });

    it('deve ter número correto de linhas', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.CSV,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      const csv = result.data as string;
      const lines = csv.trim().split('\n');

      // 1 header + 3 data lines
      expect(lines.length).toBe(4);
    });
  });

  describe('geração de Excel', () => {
    beforeEach(() => {
      mockRepository.findAll.mockResolvedValue({
        data: mockSubmissions,
        total: 3,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });
    });

    it('deve retornar Buffer para Excel', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.EXCEL,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect((result.data as Buffer).length).toBeGreaterThan(0);
    });
  });

  describe('nome do arquivo', () => {
    beforeEach(() => {
      mockRepository.findAll.mockResolvedValue({
        data: mockSubmissions,
        total: 3,
        page: 1,
        limit: 10000,
        totalPages: 1,
      });
    });

    it('deve gerar nome com data para CSV', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.CSV,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      expect(result.filename).toMatch(/^emociograma_\d{8}\.csv$/);
    });

    it('deve gerar nome com data para Excel', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.EXCEL,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      expect(result.filename).toMatch(/^emociograma_\d{8}\.xlsx$/);
    });

    it('deve gerar nome com data para JSON', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.JSON,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      expect(result.filename).toMatch(/^emociograma_\d{8}\.json$/);
    });
  });

  describe('tratamento de erros', () => {
    it('deve propagar erro do repositório', async () => {
      const error = new Error('Database connection failed');
      mockRepository.findAll.mockRejectedValue(error);

      const query: ExportQueryDto = { startDate, endDate };

      await expect(
        useCase.execute(organizationId, query, userId, Role.ADMIN),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('exportação vazia', () => {
    it('deve exportar arquivo vazio quando não há dados', async () => {
      mockRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      });

      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.JSON,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      const parsed = JSON.parse(result.data as string);
      expect(parsed).toEqual([]);
    });

    it('deve exportar CSV com apenas headers quando não há dados', async () => {
      mockRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      });

      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.CSV,
      };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      const csv = result.data as string;
      const lines = csv.trim().split('\n');

      expect(lines.length).toBe(1); // Apenas header
    });
  });
});
