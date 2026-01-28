import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IEmociogramaCategoryRepository } from '../../domain/repositories/category.repository.interface';
import { EMOCIOGRAMA_CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import type { EmociogramaCategoryEntity } from '../../domain/entities/category.entity';

/**
 * Caso de Uso: Listar Categorias
 *
 * Retorna todas as categorias ativas do emociograma ordenadas
 * por displayOrder e nome.
 */
@Injectable()
export class ListCategoriesUseCase {
  private readonly logger = new Logger(ListCategoriesUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_CATEGORY_REPOSITORY)
    private readonly categoryRepository: IEmociogramaCategoryRepository,
  ) {}

  /**
   * Executa a listagem de categorias ativas
   *
   * @returns Lista de categorias ativas ordenadas
   */
  async execute(): Promise<EmociogramaCategoryEntity[]> {
    this.logger.log('Listando categorias ativas do emociograma');

    const categories = await this.categoryRepository.findAllActive();

    this.logger.log(`Encontradas ${categories.length} categorias ativas`);

    return categories;
  }
}
