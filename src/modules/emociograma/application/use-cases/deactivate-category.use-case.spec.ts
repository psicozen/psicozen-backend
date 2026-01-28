import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeactivateCategoryUseCase } from './deactivate-category.use-case';
import { EMOCIOGRAMA_CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import type { IEmociogramaCategoryRepository } from '../../domain/repositories/category.repository.interface';
import { EmociogramaCategoryEntity } from '../../domain/entities/category.entity';

describe('DeactivateCategoryUseCase', () => {
  let useCase: DeactivateCategoryUseCase;
  let categoryRepository: jest.Mocked<IEmociogramaCategoryRepository>;

  const existingCategory = new EmociogramaCategoryEntity({
    id: 'cat-001',
    name: 'Trabalho',
    slug: 'trabalho',
    icon: '💼',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

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
        DeactivateCategoryUseCase,
        { provide: EMOCIOGRAMA_CATEGORY_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<DeactivateCategoryUseCase>(DeactivateCategoryUseCase);
    categoryRepository = module.get(EMOCIOGRAMA_CATEGORY_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should deactivate category successfully', async () => {
      const deactivatedCategory = new EmociogramaCategoryEntity({
        ...existingCategory,
        isActive: false,
      });

      categoryRepository.findById.mockResolvedValue(existingCategory);
      categoryRepository.update.mockResolvedValue(deactivatedCategory);

      const result = await useCase.execute('cat-001');

      expect(categoryRepository.findById).toHaveBeenCalledWith('cat-001');
      expect(categoryRepository.update).toHaveBeenCalled();
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when category not found', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('invalid-id')).rejects.toThrow(
        'Categoria com ID invalid-id não encontrada',
      );
    });
  });
});
