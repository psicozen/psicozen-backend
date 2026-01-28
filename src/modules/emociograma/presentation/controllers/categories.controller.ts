import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../../auth/presentation/guards/supabase-auth.guard';
import { RolesGuard } from '../../../../core/presentation/guards/roles.guard';
import { Roles } from '../../../../core/presentation/decorators/roles.decorator';
import { Public } from '../../../../core/presentation/decorators/public.decorator';
import { Role } from '../../../roles/domain/enums/role.enum';
import { ApiResponseDto } from '../../../../core/application/dtos';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.use-case';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from '../../application/use-cases/update-category.use-case';
import { DeactivateCategoryUseCase } from '../../application/use-cases/deactivate-category.use-case';
import { CreateCategoryDto } from '../../application/dtos/create-category.dto';
import { UpdateCategoryDto } from '../../application/dtos/update-category.dto';
import type { EmociogramaCategoryEntity } from '../../domain/entities/category.entity';

/**
 * Controller de Categorias do Emociograma
 *
 * Gerencia as operações CRUD de categorias de emoções.
 *
 * Endpoints:
 * - GET /emociograma/categories - Listar categorias (PÚBLICO)
 * - POST /emociograma/categories - Criar categoria (ADMIN)
 * - PATCH /emociograma/categories/:id - Atualizar categoria (ADMIN)
 * - DELETE /emociograma/categories/:id - Desativar categoria (ADMIN)
 */
@ApiTags('Emociograma - Categorias')
@Controller('emociograma/categories')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deactivateCategoryUseCase: DeactivateCategoryUseCase,
  ) {}

  // ===========================
  // PUBLIC ENDPOINT
  // ===========================

  /**
   * Listar todas as categorias ativas
   *
   * Endpoint público que retorna todas as categorias ativas do emociograma
   * ordenadas por displayOrder.
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Listar todas as categorias ativas do emociograma',
    description:
      'Retorna todas as categorias ativas ordenadas por ordem de exibição. ' +
      'Este endpoint é público e não requer autenticação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorias recuperada com sucesso',
  })
  async listCategories(): Promise<ApiResponseDto<EmociogramaCategoryEntity[]>> {
    const categories = await this.listCategoriesUseCase.execute();

    return ApiResponseDto.ok(categories);
  }

  // ===========================
  // ADMIN ENDPOINTS
  // ===========================

  /**
   * Criar nova categoria
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar nova categoria',
    description:
      'Cria uma nova categoria de emociograma. Apenas administradores podem criar categorias.',
  })
  @ApiResponse({
    status: 201,
    description: 'Categoria criada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão - requer ADMIN' })
  @ApiResponse({ status: 409, description: 'Categoria já existe' })
  async createCategory(
    @Body() dto: CreateCategoryDto,
  ): Promise<ApiResponseDto<EmociogramaCategoryEntity>> {
    const category = await this.createCategoryUseCase.execute(dto);

    return ApiResponseDto.ok(category);
  }

  /**
   * Atualizar categoria existente
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar categoria',
    description:
      'Atualiza os dados de uma categoria existente. Apenas administradores podem atualizar categorias.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da categoria (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoria atualizada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão - requer ADMIN' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  @ApiResponse({ status: 409, description: 'Nome já existe em outra categoria' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<ApiResponseDto<EmociogramaCategoryEntity>> {
    const category = await this.updateCategoryUseCase.execute(id, dto);

    return ApiResponseDto.ok(category);
  }

  /**
   * Desativar categoria (soft delete)
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Desativar categoria',
    description:
      'Desativa uma categoria existente (soft delete). ' +
      'A categoria não é removida, apenas marcada como inativa. ' +
      'Apenas administradores podem desativar categorias.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da categoria (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoria desativada com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão - requer ADMIN' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async deactivateCategory(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<EmociogramaCategoryEntity>> {
    const category = await this.deactivateCategoryUseCase.execute(id);

    return ApiResponseDto.ok(category);
  }
}
