import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmBaseRepository } from '../../../../core/infrastructure/repositories/typeorm-base.repository';
import { RoleEntity } from '../../domain/entities/role.entity';
import { RoleSchema } from '../persistence/role.schema';
import { UserRoleSchema } from '../persistence/user-role.schema';
import { IRoleRepository } from '../../domain/repositories/role.repository.interface';

@Injectable()
export class RoleRepository
  extends TypeOrmBaseRepository<RoleSchema, RoleEntity>
  implements IRoleRepository
{
  constructor(
    @InjectRepository(RoleSchema)
    private readonly roleRepository: Repository<RoleSchema>,
    @InjectRepository(UserRoleSchema)
    private readonly userRoleRepository: Repository<UserRoleSchema>,
  ) {
    super(roleRepository);
  }

  /**
   * Mapeia schema do banco para entidade de domínio
   */
  toDomain(schema: RoleSchema): RoleEntity {
    return new RoleEntity({
      id: schema.id,
      name: schema.name,
      description: schema.description,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    });
  }

  /**
   * Mapeia entidade de domínio para schema do banco
   */
  toEntity(domain: Partial<RoleEntity>): RoleSchema {
    const schema = new RoleSchema();
    if (domain.id) schema.id = domain.id;
    schema.name = domain.name!;
    schema.description = domain.description!;
    return schema;
  }

  /**
   * Buscar papel por nome único
   */
  async findByName(name: string): Promise<RoleEntity | null> {
    const schema = await this.roleRepository.findOne({
      where: { name },
    });
    return schema ? this.toDomain(schema) : null;
  }

  /**
   * Atribuir papel a um usuário em um contexto organizacional
   */
  async assignRoleToUser(data: {
    userId: string;
    roleId: string;
    organizationId?: string;
    assignedBy: string;
  }): Promise<void> {
    // Verificar se já existe antes de tentar inserir
    const exists = await this.userHasRoleInOrganization(
      data.userId,
      data.roleId,
      data.organizationId,
    );

    if (exists) {
      throw new ConflictException(
        'Usuário já possui este papel nesta organização',
      );
    }

    // Criar relacionamento
    const userRole = new UserRoleSchema();
    userRole.userId = data.userId;
    userRole.roleId = data.roleId;
    userRole.organizationId = data.organizationId;
    userRole.assignedBy = data.assignedBy;

    try {
      await this.userRoleRepository.save(userRole);
    } catch (error) {
      // Tratar erro de unique constraint (caso concorrência)
      if (error.code === '23505') {
        // PostgreSQL unique violation
        throw new ConflictException(
          'Usuário já possui este papel nesta organização',
        );
      }
      throw error;
    }
  }

  /**
   * Verificar se usuário possui papel específico em uma organização
   */
  async userHasRoleInOrganization(
    userId: string,
    roleId: string,
    organizationId?: string,
  ): Promise<boolean> {
    const whereCondition: any = {
      userId,
      roleId,
    };

    // Para papéis globais (SUPER_ADMIN), organizationId é null
    if (organizationId === undefined || organizationId === null) {
      whereCondition.organizationId = null;
    } else {
      whereCondition.organizationId = organizationId;
    }

    const count = await this.userRoleRepository.count({
      where: whereCondition,
    });

    return count > 0;
  }

  /**
   * Remover papel de um usuário em uma organização
   */
  async removeRoleFromUser(
    userId: string,
    roleId: string,
    organizationId?: string,
  ): Promise<void> {
    const whereCondition: any = {
      userId,
      roleId,
    };

    if (organizationId === undefined || organizationId === null) {
      whereCondition.organizationId = null;
    } else {
      whereCondition.organizationId = organizationId;
    }

    await this.userRoleRepository.delete(whereCondition);
  }
}
