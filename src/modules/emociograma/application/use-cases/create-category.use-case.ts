import { Injectable, Inject, Logger, ConflictException } from '@nestjs/common';
import type { IEmociogramaCategoryRepository } from '../../domain/repositories/category.repository.interface';
import { EMOCIOGRAMA_CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import { EmociogramaCategoryEntity } from '../../domain/entities/category.entity';
import type { CreateCategoryDto } from '../dtos/create-category.dto';

/**
 * Caso de Uso: Criar Categoria
 *
 * Cria uma nova categoria de emociograma validando que não existe
 * outra categoria com o mesmo nome.
 */
@Injectable()
export class CreateCategoryUseCase {
  private readonly logger = new Logger(CreateCategoryUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_CATEGORY_REPOSITORY)
    private readonly categoryRepository: IEmociogramaCategoryRepository,
  ) {}

  /**
   * Executa a criação de uma nova categoria
   *
   * @param dto - Dados da categoria a ser criada
   * @returns A categoria criada
   * @throws ConflictException - Se já existir uma categoria com o mesmo nome
   */
  async execute(dto: CreateCategoryDto): Promise<EmociogramaCategoryEntity> {
    this.logger.log(`Criando categoria: ${dto.name}`);

    // Verificar se já existe uma categoria com o mesmo nome
    const exists = await this.categoryRepository.existsByName(dto.name);
    if (exists) {
      throw new ConflictException(
        `Já existe uma categoria com o nome "${dto.name}"`,
      );
    }

    // Criar a entidade de domínio
    const category = EmociogramaCategoryEntity.create({
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      displayOrder: dto.displayOrder,
    });

    // Persistir no repositório
    const savedCategory = await this.categoryRepository.create(category);

    this.logger.log(`Categoria criada com ID: ${savedCategory.id}`);

    return savedCategory;
  }
}
