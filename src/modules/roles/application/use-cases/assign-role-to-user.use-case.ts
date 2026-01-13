import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import type { IRoleRepository } from '../../domain/repositories/role.repository.interface';
import { ROLE_REPOSITORY } from '../../domain/repositories/role.repository.interface';
import type { IOrganizationRepository } from '../../../organizations/domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../../organizations/domain/repositories/organization.repository.interface';
import { AssignRoleDto } from '../dtos/assign-role.dto';
import { Role, isGlobalRole } from '../../domain/enums/role.enum';

/**
 * Caso de uso para atribuir papel a um usuário
 *
 * Responsabilidades:
 * - Validar que usuário, papel e organização existem
 * - Verificar regras de negócio (papéis globais não precisam de organização)
 * - Prevenir duplicação de papéis
 * - Atribuir papel com auditoria (assignedBy)
 */
@Injectable()
export class AssignRoleToUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  /**
   * Executa a atribuição de papel ao usuário
   *
   * @param dto - Dados da atribuição (userId, roleName, organizationId?)
   * @param assignedBy - ID do usuário que está fazendo a atribuição (para auditoria)
   * @throws NotFoundException se usuário, papel ou organização não existirem
   * @throws BadRequestException se papel não-global não tiver organizationId
   * @throws ConflictException se usuário já tiver o papel na organização
   */
  async execute(dto: AssignRoleDto, assignedBy: string): Promise<void> {
    // 1. Validar que usuário existe
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${dto.userId} não encontrado`);
    }

    // 2. Validar que papel existe
    const role = await this.roleRepository.findByName(dto.roleName);
    if (!role) {
      throw new NotFoundException(`Papel ${dto.roleName} não encontrado`);
    }

    // 3. Validar organização (papéis não-globais requerem organizationId)
    if (!isGlobalRole(dto.roleName)) {
      if (!dto.organizationId) {
        throw new BadRequestException(
          `Papel ${dto.roleName} requer ID de organização. Apenas ${Role.SUPER_ADMIN} é um papel global.`,
        );
      }

      const organization =
        await this.organizationRepository.findById(dto.organizationId);
      if (!organization) {
        throw new NotFoundException(
          `Organização com ID ${dto.organizationId} não encontrada`,
        );
      }
    }

    // 4. Verificar se usuário já tem este papel nesta organização
    const existingRoles = await this.userRepository.getRolesByOrganization(
      dto.userId,
      dto.organizationId,
    );

    if (existingRoles.includes(dto.roleName)) {
      const scopeMessage = dto.organizationId
        ? `na organização ${dto.organizationId}`
        : 'globalmente';
      throw new ConflictException(
        `Usuário já possui o papel ${dto.roleName} ${scopeMessage}`,
      );
    }

    // 5. Atribuir papel ao usuário
    await this.roleRepository.assignRoleToUser({
      userId: dto.userId,
      roleId: role.id,
      organizationId: dto.organizationId,
      assignedBy,
    });
  }
}
