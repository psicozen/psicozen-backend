import { Test, TestingModule } from '@nestjs/testing';
import { ListCategoriesUseCase } from './list-categories.use-case';
import { EMOCIOGRAMA_CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import type { IEmociogramaCategoryRepository } from '../../domain/repositories/category.repository.interface';
import { EmociogramaCategoryEntity } from '../../domain/entities/category.entity';

describe('ListCategoriesUseCase', () => {
  let useCase: ListCategoriesUseCase;
  let categoryRepository: jest.Mocked<IEmociogramaCategoryRepository>;

  const mockCategories = [
    new EmociogramaCategoryEntity({
      id: 'cat-001',
      name: 'Trabalho',
      slug: 'trabalho',
      icon: '💼',
      displayOrder: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    new EmociogramaCategoryEntity({
      id: 'cat-002',
      name: 'Pessoal',
      slug: 'pessoal',
      icon: '🏠',
      displayOrder: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ];

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<IEmociogramaCategoryRepository>> =
      {
        findAllActive: jest.fn(),
        findById: jest.fn(),
        findBySlug: jest.fn(),
        existsByName: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findAll: jest.fn(),
        softDelete: jest.fn(),
      };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListCategoriesUseCase,
        { provide: EMOCIOGRAMA_CATEGORY_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<ListCategoriesUseCase>(ListCategoriesUseCase);
    categoryRepository = module.get(EMOCIOGRAMA_CATEGORY_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return all active categories', async () => {
      categoryRepository.findAllActive.mockResolvedValue(mockCategories);

      const result = await useCase.execute();

      expect(categoryRepository.findAllActive).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Trabalho');
      expect(result[1].name).toBe('Pessoal');
    });

    it('should return empty array when no categories exist', async () => {
      categoryRepository.findAllActive.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toHaveLength(0);
    });
  });
});
