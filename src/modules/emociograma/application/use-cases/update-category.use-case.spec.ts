import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UpdateCategoryUseCase } from './update-category.use-case';
import { EMOCIOGRAMA_CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import type { IEmociogramaCategoryRepository } from '../../domain/repositories/category.repository.interface';
import { EmociogramaCategoryEntity } from '../../domain/entities/category.entity';
import type { UpdateCategoryDto } from '../dtos/update-category.dto';

describe('UpdateCategoryUseCase', () => {
  let useCase: UpdateCategoryUseCase;
  let categoryRepository: jest.Mocked<IEmociogramaCategoryRepository>;

  const existingCategory = new EmociogramaCategoryEntity({
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
        UpdateCategoryUseCase,
        { provide: EMOCIOGRAMA_CATEGORY_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<UpdateCategoryUseCase>(UpdateCategoryUseCase);
    categoryRepository = module.get(EMOCIOGRAMA_CATEGORY_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should update category successfully', async () => {
      const updateDto: UpdateCategoryDto = {
        name: 'Trabalho Atualizado',
        description: 'Nova descrição',
      };

      const updatedCategory = new EmociogramaCategoryEntity({
        ...existingCategory,
        name: 'Trabalho Atualizado',
        slug: 'trabalho_atualizado',
        description: 'Nova descrição',
      });

      categoryRepository.findById.mockResolvedValue(existingCategory);
      categoryRepository.existsByName.mockResolvedValue(false);
      categoryRepository.update.mockResolvedValue(updatedCategory);

      const result = await useCase.execute('cat-001', updateDto);

      expect(categoryRepository.findById).toHaveBeenCalledWith('cat-001');
      expect(categoryRepository.existsByName).toHaveBeenCalledWith(
        'Trabalho Atualizado',
        'cat-001',
      );
      expect(result.name).toBe('Trabalho Atualizado');
    });

    it('should throw NotFoundException when category not found', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('invalid-id', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new name already exists', async () => {
      categoryRepository.findById.mockResolvedValue(existingCategory);
      categoryRepository.existsByName.mockResolvedValue(true);

      await expect(
        useCase.execute('cat-001', { name: 'Existing Name' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should not check name conflict when name is not changed', async () => {
      categoryRepository.findById.mockResolvedValue(existingCategory);
      categoryRepository.update.mockResolvedValue(existingCategory);

      await useCase.execute('cat-001', { description: 'New description' });

      expect(categoryRepository.existsByName).not.toHaveBeenCalled();
    });
  });
});
