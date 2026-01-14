import { IBaseRepository } from '../../../../core/domain/repositories/base.repository.interface';
import { RoleEntity } from '../entities/role.entity';

/**
 * Interface de repositório para operações de persistência de papéis (roles)
 */
export interface IRoleRepository extends IBaseRepository<RoleEntity> {
  /**
   * Buscar papel por nome único
   * @param name - Nome do papel (ex: 'admin', 'super_admin')
   * @returns Papel encontrado ou null se não existir
   */
  findByName(name: string): Promise<RoleEntity | null>;

  /**
   * Atribuir papel a um usuário em um contexto organizacional
   * @param data - Dados da atribuição (userId, roleId, organizationId?, assignedBy)
   * @throws ConflictException se o usuário já possui este papel na organização
   */
  assignRoleToUser(data: {
    userId: string;
    roleId: string;
    organizationId?: string;
    assignedBy: string;
  }): Promise<void>;

  /**
   * Verificar se usuário possui papel específico em uma organização
   * @param userId - ID do usuário
   * @param roleId - ID do papel
   * @param organizationId - ID da organização (opcional, para papéis globais)
   * @returns true se o usuário possui o papel na organização
   */
  userHasRoleInOrganization(
    userId: string,
    roleId: string,
    organizationId?: string,
  ): Promise<boolean>;

  /**
   * Remover papel de um usuário em uma organização
   * @param userId - ID do usuário
   * @param roleId - ID do papel
   * @param organizationId - ID da organização (opcional, para papéis globais)
   */
  removeRoleFromUser(
    userId: string,
    roleId: string,
    organizationId?: string,
  ): Promise<void>;
}

/**
 * Token de injeção de dependência para IRoleRepository
 */
export const ROLE_REPOSITORY = Symbol('IRoleRepository');
