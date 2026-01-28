import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateCategoryUseCase } from './create-category.use-case';
import { EMOCIOGRAMA_CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import type { IEmociogramaCategoryRepository } from '../../domain/repositories/category.repository.interface';
import { EmociogramaCategoryEntity } from '../../domain/entities/category.entity';
import type { CreateCategoryDto } from '../dtos/create-category.dto';

describe('CreateCategoryUseCase', () => {
  let useCase: CreateCategoryUseCase;
  let categoryRepository: jest.Mocked<IEmociogramaCategoryRepository>;

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
        CreateCategoryUseCase,
        { provide: EMOCIOGRAMA_CATEGORY_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<CreateCategoryUseCase>(CreateCategoryUseCase);
    categoryRepository = module.get(EMOCIOGRAMA_CATEGORY_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const createDto: CreateCategoryDto = {
      name: 'Trabalho',
      description: 'Emoções de trabalho',
      icon: '💼',
      displayOrder: 1,
    };

    it('should create category successfully', async () => {
      const savedCategory = new EmociogramaCategoryEntity({
        id: 'cat-001',
        name: 'Trabalho',
        slug: 'trabalho',
        description: 'Emoções de trabalho',
        icon: '💼',
        displayOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      categoryRepository.existsByName.mockResolvedValue(false);
      categoryRepository.create.mockResolvedValue(savedCategory);

      const result = await useCase.execute(createDto);

      expect(categoryRepository.existsByName).toHaveBeenCalledWith('Trabalho');
      expect(categoryRepository.create).toHaveBeenCalled();
      expect(result.name).toBe('Trabalho');
      expect(result.slug).toBe('trabalho');
    });

    it('should throw ConflictException when name already exists', async () => {
      categoryRepository.existsByName.mockResolvedValue(true);

      await expect(useCase.execute(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(useCase.execute(createDto)).rejects.toThrow(
        'Já existe uma categoria com o nome "Trabalho"',
      );
    });
  });
});
