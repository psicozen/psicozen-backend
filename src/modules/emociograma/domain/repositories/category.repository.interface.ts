import type { IBaseRepository } from '../../../../core/domain/repositories/base.repository.interface';
import type { EmociogramaCategoryEntity } from '../entities/category.entity';

/**
 * Interface do Repositório de Categorias do Emociograma
 *
 * Define o contrato para persistência e consultas de categorias
 * de emoções do sistema de emociograma.
 */
export interface IEmociogramaCategoryRepository
  extends IBaseRepository<EmociogramaCategoryEntity> {
  /**
   * Encontrar todas as categorias ativas ordenadas por displayOrder
   *
   * @returns Lista de categorias ativas
   */
  findAllActive(): Promise<EmociogramaCategoryEntity[]>;

  /**
   * Encontrar categoria pelo slug
   *
   * @param slug - Slug URL-friendly da categoria
   * @returns Categoria encontrada ou null
   */
  findBySlug(slug: string): Promise<EmociogramaCategoryEntity | null>;

  /**
   * Verificar se existe uma categoria com o mesmo nome
   *
   * @param name - Nome da categoria
   * @param excludeId - ID para excluir da verificação (para updates)
   * @returns true se já existe uma categoria com o nome
   */
  existsByName(name: string, excludeId?: string): Promise<boolean>;
}

/**
 * Token de injeção de dependência para o repositório de categorias
 */
export const EMOCIOGRAMA_CATEGORY_REPOSITORY = Symbol(
  'IEmociogramaCategoryRepository',
);
