import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmociogramaSubmissionRepository } from './submission.repository';
import { EmociogramaSubmissionSchema } from '../persistence/submission.schema';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';

/**
 * Interface estendida para o mock do QueryBuilder
 * Inclui métodos de SelectQueryBuilder, UpdateQueryBuilder e DeleteQueryBuilder
 */
interface MockQueryBuilder {
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  take: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  groupBy: jest.Mock;
  delete: jest.Mock;
  from: jest.Mock;
  update: jest.Mock;
  set: jest.Mock;
  getManyAndCount: jest.Mock;
  getMany: jest.Mock;
  getCount: jest.Mock;
  getRawOne: jest.Mock;
  getRawMany: jest.Mock;
  execute: jest.Mock;
}

describe('EmociogramaSubmissionRepository', () => {
  let repository: EmociogramaSubmissionRepository;
  let mockTypeOrmRepository: jest.Mocked<
    Repository<EmociogramaSubmissionSchema>
  >;

  // Mock data
  const mockOrganizationId = 'org-uuid-123';
  const mockUserId = 'user-uuid-456';
  const mockCategoryId = 'cat-uuid-789';

  const createMockSchema = (
    overrides?: Partial<EmociogramaSubmissionSchema>,
  ): EmociogramaSubmissionSchema => ({
    id: 'submission-uuid-1',
    organizationId: mockOrganizationId,
    userId: mockUserId,
    emotionLevel: 5,
    emotionEmoji: '😕',
    categoryId: mockCategoryId,
    isAnonymous: false,
    comment: 'Test comment',
    commentFlagged: false,
    submittedAt: new Date('2024-01-15T10:00:00Z'),
    department: 'Engineering',
    team: 'Backend',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    deletedAt: null,
    organization: {} as any,
    user: {} as any,
    category: {} as any,
    ...overrides,
  });

  // Mock QueryBuilder - retorna como 'any' para evitar problemas de tipo com TypeORM

  const createMockQueryBuilder = (): any => {
    const mockQb: MockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
      getCount: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      execute: jest.fn(),
    };
    return mockQb;
  };

  beforeEach(async () => {
    const mockQb = createMockQueryBuilder();

    mockTypeOrmRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    } as unknown as jest.Mocked<Repository<EmociogramaSubmissionSchema>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmociogramaSubmissionRepository,
        {
          provide: getRepositoryToken(EmociogramaSubmissionSchema),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<EmociogramaSubmissionRepository>(
      EmociogramaSubmissionRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('toDomain', () => {
    it('should convert schema to domain entity with all fields', () => {
      const schema = createMockSchema();

      const domain = repository.toDomain(schema);

      expect(domain).toBeInstanceOf(EmociogramaSubmissionEntity);
      expect(domain.id).toBe(schema.id);
      expect(domain.organizationId).toBe(schema.organizationId);
      expect(domain.userId).toBe(schema.userId);
      expect(domain.emotionLevel).toBe(schema.emotionLevel);
      expect(domain.emotionEmoji).toBe(schema.emotionEmoji);
      expect(domain.categoryId).toBe(schema.categoryId);
      expect(domain.isAnonymous).toBe(schema.isAnonymous);
      expect(domain.comment).toBe(schema.comment);
      expect(domain.commentFlagged).toBe(schema.commentFlagged);
      expect(domain.submittedAt).toBe(schema.submittedAt);
      expect(domain.department).toBe(schema.department);
      expect(domain.team).toBe(schema.team);
      expect(domain.createdAt).toBe(schema.createdAt);
      expect(domain.updatedAt).toBe(schema.updatedAt);
    });

    it('should convert null fields to undefined', () => {
      const schema = createMockSchema({
        comment: null,
        department: null,
        team: null,
        deletedAt: null,
      });

      const domain = repository.toDomain(schema);

      expect(domain.comment).toBeUndefined();
      expect(domain.department).toBeUndefined();
      expect(domain.team).toBeUndefined();
      expect(domain.deletedAt).toBeUndefined();
    });

    it('should preserve deletedAt when present', () => {
      const deletedDate = new Date('2024-01-20T10:00:00Z');
      const schema = createMockSchema({ deletedAt: deletedDate });

      const domain = repository.toDomain(schema);

      expect(domain.deletedAt).toBe(deletedDate);
    });
  });

  describe('toEntity', () => {
    it('should convert domain to schema entity', () => {
      const domain: Partial<EmociogramaSubmissionEntity> = {
        id: 'submission-uuid-1',
        organizationId: mockOrganizationId,
        userId: mockUserId,
        emotionLevel: 7,
        emotionEmoji: '😢',
        categoryId: mockCategoryId,
        isAnonymous: true,
        comment: 'Feeling stressed',
        commentFlagged: false,
        submittedAt: new Date('2024-01-15T10:00:00Z'),
        department: 'Sales',
        team: 'Enterprise',
      };

      const schema = repository.toEntity(domain);

      expect(schema).toBeInstanceOf(EmociogramaSubmissionSchema);
      expect(schema.id).toBe(domain.id);
      expect(schema.organizationId).toBe(domain.organizationId);
      expect(schema.userId).toBe(domain.userId);
      expect(schema.emotionLevel).toBe(domain.emotionLevel);
      expect(schema.emotionEmoji).toBe(domain.emotionEmoji);
      expect(schema.isAnonymous).toBe(domain.isAnonymous);
      expect(schema.comment).toBe(domain.comment);
      expect(schema.department).toBe(domain.department);
      expect(schema.team).toBe(domain.team);
    });

    it('should not set optional fields when undefined (partial update safety)', () => {
      const domain: Partial<EmociogramaSubmissionEntity> = {
        organizationId: mockOrganizationId,
        userId: mockUserId,
        emotionLevel: 3,
        emotionEmoji: '😌',
        categoryId: mockCategoryId,
        isAnonymous: false,
        // comment, department, team não definidos (partial update)
      };

      const schema = repository.toEntity(domain);

      // Propriedades não definidas não devem ser setadas no schema
      // Isso permite partial updates seguros
      expect(schema.comment).toBeUndefined();
      expect(schema.department).toBeUndefined();
      expect(schema.team).toBeUndefined();
    });

    it('should only set properties that are defined', () => {
      const domain: Partial<EmociogramaSubmissionEntity> = {
        emotionLevel: 5,
      };

      const schema = repository.toEntity(domain);

      expect(schema.emotionLevel).toBe(5);
      expect(schema.id).toBeUndefined();
      expect(schema.organizationId).toBeUndefined();
    });
  });

  describe('findByUser', () => {
    it('should return paginated submissions for a user', async () => {
      const mockSchemas = [
        createMockSchema({ id: 'sub-1' }),
        createMockSchema({ id: 'sub-2' }),
      ];
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([mockSchemas, 15]);
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await repository.findByUser(
        mockUserId,
        mockOrganizationId,
        { take: 10, skip: 0 },
      );

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(15);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(2);
      expect(mockQb.where).toHaveBeenCalledWith(
        'submission.user_id = :userId',
        { userId: mockUserId },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'submission.organization_id = :organizationId',
        { organizationId: mockOrganizationId },
      );
    });

    it('should calculate correct page number with offset', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[], 50]);
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await repository.findByUser(
        mockUserId,
        mockOrganizationId,
        { take: 10, skip: 20 },
      );

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
    });

    it('should use default pagination when options not provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await repository.findByUser(
        mockUserId,
        mockOrganizationId,
      );

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
      expect(mockQb.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('getAggregatedByTimeRange', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should return aggregated data for time range', async () => {
      const mockQb = createMockQueryBuilder();

      // Setup mocks for each aggregation query
      mockQb.getCount.mockResolvedValue(100);
      mockQb.getRawOne.mockResolvedValue({ avg: '4.5' });
      mockQb.getRawMany
        .mockResolvedValueOnce([
          { level: 1, count: '10' },
          { level: 5, count: '50' },
          { level: 8, count: '40' },
        ]) // distributionByLevel
        .mockResolvedValueOnce([
          { categoryId: 'cat-1', count: '60' },
          { categoryId: 'cat-2', count: '40' },
        ]) // distributionByCategory
        .mockResolvedValueOnce([
          { isAnonymous: true, count: '30' },
          { isAnonymous: false, count: '70' },
        ]) // anonymityCount
        .mockResolvedValueOnce([
          { date: '2024-01-01', avgLevel: '4.0' },
          { date: '2024-01-02', avgLevel: '5.0' },
        ]); // trendData

      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await repository.getAggregatedByTimeRange(
        mockOrganizationId,
        startDate,
        endDate,
      );

      expect(result.totalSubmissions).toBe(100);
      expect(result.averageEmotionLevel).toBe(4.5);
      expect(result.distributionByLevel[1]).toBe(10);
      expect(result.distributionByLevel[5]).toBe(50);
      expect(result.distributionByLevel[8]).toBe(40);
      expect(result.distributionByCategory['cat-1']).toBe(60);
      expect(result.distributionByCategory['cat-2']).toBe(40);
      expect(result.anonymousCount).toBe(30);
      expect(result.identifiedCount).toBe(70);
      expect(result.trendData).toHaveLength(2);
      expect(result.trendData[0].date).toBe('2024-01-01');
      expect(result.trendData[0].avgLevel).toBe(4.0);
    });

    it('should apply department filter when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getRawOne.mockResolvedValue({ avg: null });
      mockQb.getRawMany.mockResolvedValue([]);
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      await repository.getAggregatedByTimeRange(
        mockOrganizationId,
        startDate,
        endDate,
        { department: 'Engineering' },
      );

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'submission.department = :department',
        { department: 'Engineering' },
      );
    });

    it('should apply team filter when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getRawOne.mockResolvedValue({ avg: null });
      mockQb.getRawMany.mockResolvedValue([]);
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      await repository.getAggregatedByTimeRange(
        mockOrganizationId,
        startDate,
        endDate,
        { team: 'Backend' },
      );

      expect(mockQb.andWhere).toHaveBeenCalledWith('submission.team = :team', {
        team: 'Backend',
      });
    });

    it('should apply emotion level range filters', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getRawOne.mockResolvedValue({ avg: null });
      mockQb.getRawMany.mockResolvedValue([]);
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      await repository.getAggregatedByTimeRange(
        mockOrganizationId,
        startDate,
        endDate,
        { minEmotionLevel: 6, maxEmotionLevel: 10 },
      );

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'submission.emotion_level >= :minLevel',
        { minLevel: 6 },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'submission.emotion_level <= :maxLevel',
        { maxLevel: 10 },
      );
    });

    it('should handle empty results gracefully', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getRawOne.mockResolvedValue({ avg: null });
      mockQb.getRawMany.mockResolvedValue([]);
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await repository.getAggregatedByTimeRange(
        mockOrganizationId,
        startDate,
        endDate,
      );

      expect(result.totalSubmissions).toBe(0);
      expect(result.averageEmotionLevel).toBe(0);
      expect(result.anonymousCount).toBe(0);
      expect(result.identifiedCount).toBe(0);
      expect(Object.keys(result.distributionByLevel)).toHaveLength(0);
      expect(result.trendData).toHaveLength(0);
    });
  });

  describe('findSubmissionsAboveThreshold', () => {
    it('should find submissions with emotion level above threshold', async () => {
      const mockSchemas = [
        createMockSchema({ id: 'sub-1', emotionLevel: 8 }),
        createMockSchema({ id: 'sub-2', emotionLevel: 9 }),
      ];
      mockTypeOrmRepository.find.mockResolvedValue(mockSchemas);

      const result = await repository.findSubmissionsAboveThreshold(
        mockOrganizationId,
        6,
        new Date('2024-01-01'),
      );

      expect(result).toHaveLength(2);
      expect(result[0].emotionLevel).toBe(8);
      expect(result[1].emotionLevel).toBe(9);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
          }),
          order: { submittedAt: 'DESC' },
        }),
      );
    });

    it('should return empty array when no submissions above threshold', async () => {
      mockTypeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findSubmissionsAboveThreshold(
        mockOrganizationId,
        6,
        new Date('2024-01-01'),
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getMostMotivated', () => {
    it('should return users ordered by lowest average emotion level', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([
        {
          userId: 'user-1',
          avgLevel: '2.5',
          count: '10',
          lastSubmittedAt: new Date('2024-01-15'),
        },
        {
          userId: 'user-2',
          avgLevel: '3.0',
          count: '8',
          lastSubmittedAt: new Date('2024-01-14'),
        },
      ]);
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await repository.getMostMotivated(mockOrganizationId, 5);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].averageEmotionLevel).toBe(2.5);
      expect(result[0].submissionCount).toBe(10);
      expect(mockQb.orderBy).toHaveBeenCalledWith('avgLevel', 'ASC');
      expect(mockQb.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('getLeastMotivated', () => {
    it('should return users ordered by highest average emotion level', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([
        {
          userId: 'user-1',
          avgLevel: '8.5',
          count: '5',
          lastSubmittedAt: new Date('2024-01-15'),
        },
        {
          userId: 'user-2',
          avgLevel: '7.0',
          count: '12',
          lastSubmittedAt: new Date('2024-01-14'),
        },
      ]);
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await repository.getLeastMotivated(mockOrganizationId, 5);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].averageEmotionLevel).toBe(8.5);
      expect(mockQb.orderBy).toHaveBeenCalledWith('avgLevel', 'DESC');
    });
  });

  describe('getByDepartment', () => {
    it('should delegate to getAggregatedByTimeRange with department filter', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(50);
      mockQb.getRawOne.mockResolvedValue({ avg: '5.0' });
      mockQb.getRawMany.mockResolvedValue([]);
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      const timeRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const result = await repository.getByDepartment(
        mockOrganizationId,
        'Engineering',
        timeRange,
      );

      expect(result.totalSubmissions).toBe(50);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'submission.department = :department',
        { department: 'Engineering' },
      );
    });
  });

  describe('getByTeam', () => {
    it('should delegate to getAggregatedByTimeRange with team filter', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(25);
      mockQb.getRawOne.mockResolvedValue({ avg: '4.0' });
      mockQb.getRawMany.mockResolvedValue([]);
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      const timeRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const result = await repository.getByTeam(
        mockOrganizationId,
        'Backend',
        timeRange,
      );

      expect(result.totalSubmissions).toBe(25);
      expect(mockQb.andWhere).toHaveBeenCalledWith('submission.team = :team', {
        team: 'Backend',
      });
    });
  });

  describe('deleteByUser (LGPD)', () => {
    it('should hard delete all submissions for user in organization', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.execute.mockResolvedValue({ affected: 10 });
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      await repository.deleteByUser(mockUserId, mockOrganizationId);

      expect(mockQb.delete).toHaveBeenCalled();
      expect(mockQb.from).toHaveBeenCalledWith(EmociogramaSubmissionSchema);
      expect(mockQb.where).toHaveBeenCalledWith('user_id = :userId', {
        userId: mockUserId,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'organization_id = :organizationId',
        { organizationId: mockOrganizationId },
      );
      expect(mockQb.execute).toHaveBeenCalled();
    });
  });

  describe('anonymizeByUser (LGPD)', () => {
    it('should anonymize all submissions for user in organization', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.execute.mockResolvedValue({ affected: 10 });
      mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQb);

      await repository.anonymizeByUser(mockUserId, mockOrganizationId);

      expect(mockQb.update).toHaveBeenCalledWith(EmociogramaSubmissionSchema);
      expect(mockQb.set).toHaveBeenCalledWith({
        isAnonymous: true,
        comment: null,
      });
      expect(mockQb.where).toHaveBeenCalledWith('user_id = :userId', {
        userId: mockUserId,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'organization_id = :organizationId',
        { organizationId: mockOrganizationId },
      );
      expect(mockQb.execute).toHaveBeenCalled();
    });
  });
});
