import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CategoriesController } from './categories.controller';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.use-case';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from '../../application/use-cases/update-category.use-case';
import { DeactivateCategoryUseCase } from '../../application/use-cases/deactivate-category.use-case';
import { SupabaseAuthGuard } from '../../../auth/presentation/guards/supabase-auth.guard';
import { RolesGuard } from '../../../../core/presentation/guards/roles.guard';
import { EmociogramaCategoryEntity } from '../../domain/entities/category.entity';
import type { CreateCategoryDto } from '../../application/dtos/create-category.dto';
import type { UpdateCategoryDto } from '../../application/dtos/update-category.dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let listCategoriesUseCase: jest.Mocked<ListCategoriesUseCase>;
  let createCategoryUseCase: jest.Mocked<CreateCategoryUseCase>;
  let updateCategoryUseCase: jest.Mocked<UpdateCategoryUseCase>;
  let deactivateCategoryUseCase: jest.Mocked<DeactivateCategoryUseCase>;

  const mockCategory = new EmociogramaCategoryEntity({
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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: ListCategoriesUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateCategoryUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateCategoryUseCase, useValue: { execute: jest.fn() } },
        { provide: DeactivateCategoryUseCase, useValue: { execute: jest.fn() } },
        Reflector,
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
    listCategoriesUseCase = module.get(ListCategoriesUseCase);
    createCategoryUseCase = module.get(CreateCategoryUseCase);
    updateCategoryUseCase = module.get(UpdateCategoryUseCase);
    deactivateCategoryUseCase = module.get(DeactivateCategoryUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listCategories', () => {
    it('should return all active categories', async () => {
      listCategoriesUseCase.execute.mockResolvedValue([mockCategory]);

      const result = await controller.listCategories();

      expect(listCategoriesUseCase.execute).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].name).toBe('Trabalho');
    });

    it('should return empty array when no categories', async () => {
      listCategoriesUseCase.execute.mockResolvedValue([]);

      const result = await controller.listCategories();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('createCategory', () => {
    const createDto: CreateCategoryDto = {
      name: 'Trabalho',
      description: 'Emoções de trabalho',
      icon: '💼',
      displayOrder: 1,
    };

    it('should create category successfully', async () => {
      createCategoryUseCase.execute.mockResolvedValue(mockCategory);

      const result = await controller.createCategory(createDto);

      expect(createCategoryUseCase.execute).toHaveBeenCalledWith(createDto);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Trabalho');
    });
  });

  describe('updateCategory', () => {
    const updateDto: UpdateCategoryDto = {
      name: 'Trabalho Atualizado',
      description: 'Nova descrição',
    };

    it('should update category successfully', async () => {
      const updatedCategory = new EmociogramaCategoryEntity({
        ...mockCategory,
        name: 'Trabalho Atualizado',
        description: 'Nova descrição',
      });
      updateCategoryUseCase.execute.mockResolvedValue(updatedCategory);

      const result = await controller.updateCategory('cat-001', updateDto);

      expect(updateCategoryUseCase.execute).toHaveBeenCalledWith(
        'cat-001',
        updateDto,
      );
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Trabalho Atualizado');
    });
  });

  describe('deactivateCategory', () => {
    it('should deactivate category successfully', async () => {
      const deactivatedCategory = new EmociogramaCategoryEntity({
        ...mockCategory,
        isActive: false,
      });
      deactivateCategoryUseCase.execute.mockResolvedValue(deactivatedCategory);

      const result = await controller.deactivateCategory('cat-001');

      expect(deactivateCategoryUseCase.execute).toHaveBeenCalledWith('cat-001');
      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(false);
    });
  });
});
