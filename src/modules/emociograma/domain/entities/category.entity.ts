import { BaseEntity } from '../../../../core/domain/entities/base.entity';
import { ValidationException } from '../../../../core/domain/exceptions/validation.exception';

/**
 * Parâmetros para criação de uma categoria de emociograma
 */
export interface CreateEmociogramaCategoryParams {
  name: string;
  description?: string;
  icon?: string;
  displayOrder: number;
}

/**
 * Parâmetros para atualização de uma categoria de emociograma
 */
export interface UpdateEmociogramaCategoryParams {
  name?: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
}

/**
 * Entidade de Domínio - Categoria de Emociograma
 *
 * Representa uma categoria de emoções no sistema de emociograma.
 * Exemplos: "Felicidade", "Ansiedade", "Motivação", etc.
 */
export class EmociogramaCategoryEntity extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;

  constructor(partial?: Partial<EmociogramaCategoryEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }

  /**
   * Método factory para criar uma nova categoria com validação
   */
  static create(
    params: CreateEmociogramaCategoryParams,
  ): EmociogramaCategoryEntity {
    EmociogramaCategoryEntity.validateCreateParams(params);

    return new EmociogramaCategoryEntity({
      name: params.name.trim(),
      slug: EmociogramaCategoryEntity.generateSlug(params.name),
      description: params.description?.trim(),
      icon: params.icon?.trim(),
      displayOrder: params.displayOrder,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Ativa a categoria
   */
  activate(): void {
    this.isActive = true;
    this.touch();
  }

  /**
   * Desativa a categoria
   */
  deactivate(): void {
    this.isActive = false;
    this.touch();
  }

  /**
   * Atualiza os detalhes da categoria
   */
  updateDetails(params: UpdateEmociogramaCategoryParams): void {
    const errors: Record<string, string[]> = {};

    if (params.name !== undefined) {
      const trimmedName = params.name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 50) {
        errors.name = ['O nome da categoria deve ter entre 2 e 50 caracteres'];
      } else {
        this.name = trimmedName;
        this.slug = EmociogramaCategoryEntity.generateSlug(trimmedName);
      }
    }

    if (params.description !== undefined) {
      this.description = params.description.trim() || undefined;
    }

    if (params.icon !== undefined) {
      this.icon = params.icon.trim() || undefined;
    }

    if (params.displayOrder !== undefined) {
      if (params.displayOrder < 0) {
        errors.displayOrder = [
          'A ordem de exibição deve ser maior ou igual a zero',
        ];
      } else {
        this.displayOrder = params.displayOrder;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException(errors);
    }

    this.touch();
  }

  /**
   * Gera um slug URL-friendly a partir do nome
   *
   * Exemplos:
   * - "Felicidade" → "felicidade"
   * - "Ansiedade e Estresse" → "ansiedade_e_estresse"
   * - "Motivação" → "motivacao"
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '_') // Substitui não-alfanuméricos por underscore
      .replace(/^_+|_+$/g, ''); // Remove underscores no início/fim
  }

  /**
   * Valida os parâmetros de criação
   */
  private static validateCreateParams(
    params: CreateEmociogramaCategoryParams,
  ): void {
    const errors: Record<string, string[]> = {};

    // Validar nome
    if (!params.name || params.name.trim().length < 2) {
      errors.name = ['O nome da categoria deve ter pelo menos 2 caracteres'];
    } else if (params.name.trim().length > 50) {
      errors.name = ['O nome da categoria deve ter no máximo 50 caracteres'];
    }

    // Validar displayOrder
    if (params.displayOrder === undefined || params.displayOrder === null) {
      errors.displayOrder = ['A ordem de exibição é obrigatória'];
    } else if (params.displayOrder < 0) {
      errors.displayOrder = [
        'A ordem de exibição deve ser maior ou igual a zero',
      ];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException(errors);
    }
  }
}
