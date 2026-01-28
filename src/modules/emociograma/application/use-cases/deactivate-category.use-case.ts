import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import type { IEmociogramaCategoryRepository } from '../../domain/repositories/category.repository.interface';
import { EMOCIOGRAMA_CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import type { EmociogramaCategoryEntity } from '../../domain/entities/category.entity';

/**
 * Caso de Uso: Desativar Categoria
 *
 * Desativa uma categoria do emociograma (soft delete).
 * A categoria não é removida, apenas marcada como inativa.
 */
@Injectable()
export class DeactivateCategoryUseCase {
  private readonly logger = new Logger(DeactivateCategoryUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_CATEGORY_REPOSITORY)
    private readonly categoryRepository: IEmociogramaCategoryRepository,
  ) {}

  /**
   * Executa a desativação de uma categoria
   *
   * @param id - ID da categoria a ser desativada
   * @returns A categoria desativada
   * @throws NotFoundException - Se a categoria não for encontrada
   */
  async execute(id: string): Promise<EmociogramaCategoryEntity> {
    this.logger.log(`Desativando categoria: ${id}`);

    // Buscar a categoria existente
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Categoria com ID ${id} não encontrada`);
    }

    // Desativar a categoria
    category.deactivate();

    // Persistir a alteração
    const deactivatedCategory = await this.categoryRepository.update(
      id,
      category,
    );

    this.logger.log(`Categoria ${id} desativada com sucesso`);

    return deactivatedCategory;
  }
}
