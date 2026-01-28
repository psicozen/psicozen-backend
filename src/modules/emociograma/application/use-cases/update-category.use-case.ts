import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { IEmociogramaCategoryRepository } from '../../domain/repositories/category.repository.interface';
import { EMOCIOGRAMA_CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import type { EmociogramaCategoryEntity } from '../../domain/entities/category.entity';
import type { UpdateCategoryDto } from '../dtos/update-category.dto';

/**
 * Caso de Uso: Atualizar Categoria
 *
 * Atualiza os dados de uma categoria existente validando
 * que o novo nome não conflita com outra categoria.
 */
@Injectable()
export class UpdateCategoryUseCase {
  private readonly logger = new Logger(UpdateCategoryUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_CATEGORY_REPOSITORY)
    private readonly categoryRepository: IEmociogramaCategoryRepository,
  ) {}

  /**
   * Executa a atualização de uma categoria
   *
   * @param id - ID da categoria a ser atualizada
   * @param dto - Dados a serem atualizados
   * @returns A categoria atualizada
   * @throws NotFoundException - Se a categoria não for encontrada
   * @throws ConflictException - Se o novo nome já existir em outra categoria
   */
  async execute(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<EmociogramaCategoryEntity> {
    this.logger.log(`Atualizando categoria: ${id}`);

    // Buscar a categoria existente
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Categoria com ID ${id} não encontrada`);
    }

    // Verificar conflito de nome (se estiver alterando o nome)
    if (dto.name && dto.name !== category.name) {
      const exists = await this.categoryRepository.existsByName(dto.name, id);
      if (exists) {
        throw new ConflictException(
          `Já existe uma categoria com o nome "${dto.name}"`,
        );
      }
    }

    // Atualizar os detalhes da categoria
    category.updateDetails({
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      displayOrder: dto.displayOrder,
    });

    // Persistir as alterações
    const updatedCategory = await this.categoryRepository.update(id, category);

    this.logger.log(`Categoria ${id} atualizada com sucesso`);

    return updatedCategory;
  }
}
