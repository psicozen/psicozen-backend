import { IBaseRepository } from '../../../../core/domain/repositories/base.repository.interface';
import { OrganizationEntity } from '../entities/organization.entity';
import { OrganizationType } from '../types/organization-settings.types';

/**
 * Interface de repositório para operações de persistência de organização
 */
export interface IOrganizationRepository
  extends IBaseRepository<OrganizationEntity> {
  /**
   * Buscar organização por slug único
   * @param slug - Identificador único em formato URL-friendly
   * @returns Organização encontrada ou null se não existir
   */
  findBySlug(slug: string): Promise<OrganizationEntity | null>;

  /**
   * Buscar todas as organizações filhas de um pai
   * @param parentId - UUID da organização pai
   * @returns Lista de organizações filhas
   */
  findChildren(parentId: string): Promise<OrganizationEntity[]>;

  /**
   * Buscar todas as organizações ativas por tipo
   * @param type - Tipo da organização (company, department, team)
   * @returns Lista de organizações ativas do tipo especificado
   */
  findActiveByType(type: OrganizationType): Promise<OrganizationEntity[]>;
}

/**
 * Token de injeção de dependência para IOrganizationRepository
 */
export const ORGANIZATION_REPOSITORY = Symbol('IOrganizationRepository');
