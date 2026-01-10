# Marco 2: RBAC Aprimorado com Escopo de Organização

**Cronograma:** Semana 1-2
**Dependências:** Marco 1 (Tabela Organizations deve existir)
**Status:** 🔴 Não Iniciado

---

## Visão Geral

Aprimorar o sistema RBAC existente para suportar papéis hierárquicos (Admin > Gestor > Colaborador) com escopo baseado em organização. Transformar o sistema de papéis plano atual em um sistema de permissões hierárquico multi-tenant.

**Entregável Principal:** Usuários podem ter diferentes papéis em diferentes organizações com verificações de permissão hierárquicas.

---

## Detalhamento de Tarefas

### Tarefa 2.1: Migração do Banco de Dados - Adicionar Escopo de Organização aos Papéis

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo de migração: `src/core/infrastructure/database/migrations/[timestamp]-AddOrganizationScopeToRBACTables.ts`
- [ ] Adicionar colunas à tabela `roles`:
  - [ ] `organization_id UUID` (nullable, FK para organizations)
  - [ ] `hierarchy_level INTEGER NOT NULL DEFAULT 100`
  - [ ] `is_system_role BOOLEAN DEFAULT false`
- [ ] Criar índices:
  - [ ] `idx_roles_organization_id` em `organization_id`
  - [ ] `idx_roles_hierarchy_level` em `hierarchy_level`
- [ ] Modificar tabela `user_roles`:
  - [ ] Adicionar `organization_id UUID` (FK para organizations)
  - [ ] Remover restrição única em `(user_id, role_id)`
  - [ ] Adicionar restrição única em `(user_id, role_id, organization_id)`
- [ ] Criar índices em `user_roles`:
  - [ ] `idx_user_roles_organization_id`
  - [ ] `idx_user_roles_composite` em `(user_id, organization_id)`
- [ ] Inserir papéis do sistema (SUPER_ADMIN, ADMIN, GESTOR, COLABORADOR)
- [ ] Testar migração e rollback

**Migração SQL:**
```sql
-- Adicionar colunas à tabela roles
ALTER TABLE roles
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN hierarchy_level INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN is_system_role BOOLEAN DEFAULT false;

-- Criar índices
CREATE INDEX idx_roles_organization_id ON roles(organization_id);
CREATE INDEX idx_roles_hierarchy_level ON roles(hierarchy_level);

-- Modificar tabela user_roles
ALTER TABLE user_roles
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Remover restrição única antiga
ALTER TABLE user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_id_key;

-- Adicionar nova restrição única (usuário pode ter mesmo papel em diferentes orgs)
ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_unique UNIQUE (user_id, role_id, organization_id);

-- Criar índices
CREATE INDEX idx_user_roles_organization_id ON user_roles(organization_id);
CREATE INDEX idx_user_roles_composite ON user_roles(user_id, organization_id);

-- Inserir papéis do sistema
INSERT INTO roles (name, description, hierarchy_level, is_system_role) VALUES
  ('super_admin', 'Super Administrador da Plataforma', 0, true),
  ('admin', 'Administrador da Organização', 100, true),
  ('gestor', 'Gerente de Equipe', 200, true),
  ('colaborador', 'Funcionário', 300, true);
```

**Critérios de Aceite:**
- ✅ Migração executada com sucesso
- ✅ Todos os índices criados
- ✅ Restrição única atualizada
- ✅ Papéis do sistema inseridos
- ✅ Migração pode ser revertida

---

### Tarefa 2.2: Atualizar Enum de Papel com Hierarquia

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 1 hora
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Atualizar arquivo: `src/modules/roles/domain/enums/role.enum.ts`
- [ ] Definir enum de papel hierárquico (SUPER_ADMIN, ADMIN, GESTOR, COLABORADOR)
- [ ] Criar constante `ROLE_HIERARCHY` mapeando papéis para níveis numéricos
- [ ] Implementar função auxiliar `hasHigherRole()` para verificações de hierarquia
- [ ] Adicionar comentários JSDoc explicando a hierarquia

**Código do Enum de Papel:**
```typescript
/**
 * Sistema de papéis hierárquico para PsicoZen
 * Menor hierarchy_level = maiores privilégios
 */
export enum Role {
  /** Super administrador da plataforma (nível 0) */
  SUPER_ADMIN = 'super_admin',

  /** Administrador da organização (nível 100) */
  ADMIN = 'admin',

  /** Gerente/supervisor de equipe (nível 200) */
  GESTOR = 'gestor',

  /** Funcionário padrão (nível 300) */
  COLABORADOR = 'colaborador',
}

/**
 * Níveis de hierarquia numéricos para papéis
 * Número menor = maior privilégio
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 0,
  [Role.ADMIN]: 100,
  [Role.GESTOR]: 200,
  [Role.COLABORADOR]: 300,
};

/**
 * Verifica se o papel do usuário tem privilégios suficientes
 * @param userRole - Papel atribuído ao usuário
 * @param requiredRole - Papel mínimo requerido
 * @returns true se o papel do usuário tem privilégios iguais ou superiores
 * @example
 * hasHigherRole(Role.ADMIN, Role.GESTOR) // true (Admin pode fazer o que Gestor faz)
 * hasHigherRole(Role.COLABORADOR, Role.ADMIN) // false (Colaborador não pode fazer tarefas de Admin)
 */
export function hasHigherRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] <= ROLE_HIERARCHY[requiredRole];
}

/**
 * Obtém todos os papéis com privilégio igual ou menor que o papel fornecido
 * @example
 * getSubordinateRoles(Role.GESTOR) // [Role.GESTOR, Role.COLABORADOR]
 */
export function getSubordinateRoles(role: Role): Role[] {
  const level = ROLE_HIERARCHY[role];
  return Object.values(Role).filter(r => ROLE_HIERARCHY[r] >= level);
}
```

**Critérios de Aceite:**
- ✅ Enum define 4 papéis
- ✅ Constante de hierarquia mapeia papéis para níveis
- ✅ Funções auxiliares funcionam corretamente
- ✅ Comentários JSDoc explicam o uso

---

### Tarefa 2.3: Definir Permissões do Emociograma

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar diretório: `src/modules/emociograma/domain/enums/`
- [ ] Criar arquivo: `emociograma-permissions.enum.ts`
- [ ] Definir permissões usando formato: `resource:action:scope`
- [ ] Agrupar permissões por papel:
  - [ ] Colaborador: submit:own, view:own
  - [ ] Gestor: view:team_aggregated, view:team_anonymized, export:team
  - [ ] Admin: view:all_aggregated, view:all_identified, export:all, configure:alerts, manage:categories
- [ ] Criar conjuntos de permissões para atribuição fácil de papéis

**Enum de Permissões:**
```typescript
/**
 * Permissões do módulo Emociograma
 * Formato: resource:action:scope
 */
export enum EmociogramaPermissions {
  // ============================================
  // PERMISSÕES DE COLABORADOR (enviar e visualizar próprios dados)
  // ============================================

  /** Enviar próprio estado emocional */
  SUBMIT_OWN = 'emociograma:submit:own',

  /** Visualizar próprio histórico de submissões */
  VIEW_OWN = 'emociograma:view:own',

  // ============================================
  // PERMISSÕES DE GESTOR (acesso em nível de equipe)
  // ============================================

  /** Visualizar dados agregados da equipe (sem identidades individuais) */
  VIEW_TEAM_AGGREGATED = 'emociograma:view:team_aggregated',

  /** Visualizar lista anonimizada de submissões da equipe */
  VIEW_TEAM_ANONYMIZED = 'emociograma:view:team_anonymized',

  /** Exportar dados da equipe (CSV/Excel) */
  EXPORT_TEAM_DATA = 'emociograma:export:team',

  // ============================================
  // PERMISSÕES DE ADMIN (acesso em nível de organização)
  // ============================================

  /** Visualizar dados agregados da organização */
  VIEW_ALL_AGGREGATED = 'emociograma:view:all_aggregated',

  /** Visualizar submissões identificadas (pode ver quem enviou) */
  VIEW_ALL_IDENTIFIED = 'emociograma:view:all_identified',

  /** Exportar todos os dados da organização */
  EXPORT_ALL_DATA = 'emociograma:export:all',

  /** Configurar limites de alerta e notificações */
  CONFIGURE_ALERTS = 'emociograma:configure:alerts',

  /** Gerenciar categorias de emoção */
  MANAGE_CATEGORIES = 'emociograma:manage:categories',
}

/**
 * Conjuntos de permissões para atribuição fácil de papéis
 */
export const EMOCIOGRAMA_PERMISSION_SETS = {
  COLABORADOR: [
    EmociogramaPermissions.SUBMIT_OWN,
    EmociogramaPermissions.VIEW_OWN,
  ],
  GESTOR: [
    EmociogramaPermissions.SUBMIT_OWN,
    EmociogramaPermissions.VIEW_OWN,
    EmociogramaPermissions.VIEW_TEAM_AGGREGATED,
    EmociogramaPermissions.VIEW_TEAM_ANONYMIZED,
    EmociogramaPermissions.EXPORT_TEAM_DATA,
  ],
  ADMIN: [
    EmociogramaPermissions.SUBMIT_OWN,
    EmociogramaPermissions.VIEW_OWN,
    EmociogramaPermissions.VIEW_TEAM_AGGREGATED,
    EmociogramaPermissions.VIEW_TEAM_ANONYMIZED,
    EmociogramaPermissions.EXPORT_TEAM_DATA,
    EmociogramaPermissions.VIEW_ALL_AGGREGATED,
    EmociogramaPermissions.VIEW_ALL_IDENTIFIED,
    EmociogramaPermissions.EXPORT_ALL_DATA,
    EmociogramaPermissions.CONFIGURE_ALERTS,
    EmociogramaPermissions.MANAGE_CATEGORIES,
  ],
};
```

**Critérios de Aceite:**
- ✅ Todas as permissões definidas com formato resource:action:scope
- ✅ Conjuntos de permissões mapeados para papéis
- ✅ Comentários JSDoc explicam cada permissão

---

### Tarefa 2.4: Aprimorar RolesGuard com Contexto de Organização

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 4 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Atualizar arquivo: `src/core/presentation/guards/roles.guard.ts`
- [ ] Injetar `USER_REPOSITORY` para carregar papéis do usuário
- [ ] Extrair `x-organization-id` dos headers da requisição
- [ ] Carregar papéis do usuário para a organização específica
- [ ] Verificar hierarquia de papéis usando função `hasHigherRole()`
- [ ] Retornar false se usuário não tiver papel suficiente
- [ ] Tratar casos especiais (org ID ausente, usuário não na org, etc.)

**Código do RolesGuard Aprimorado:**
```typescript
import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role, hasHigherRole } from '@/modules/roles/domain/enums/role.enum';
import { IUserRepository, USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(USER_REPOSITORY) private userRepository: IUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obter papéis requeridos do decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se nenhum papel requerido, permitir acesso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Do JwtAuthGuard
    const organizationId = request.headers['x-organization-id'] as string;

    // Usuário deve estar autenticado
    if (!user) {
      return false;
    }

    // Super admins ignoram verificações de organização
    const userRoles = await this.userRepository.getRolesByOrganization(
      user.id,
      organizationId,
    );

    // Verificar se usuário tem papel SUPER_ADMIN (papel global, sem org necessária)
    if (userRoles.includes(Role.SUPER_ADMIN)) {
      return true;
    }

    // Para outros papéis, ID da organização é necessário
    if (!organizationId) {
      return false;
    }

    // Verificar se usuário tem algum dos papéis requeridos com hierarquia suficiente
    return requiredRoles.some(requiredRole =>
      userRoles.some(userRole => hasHigherRole(userRole, requiredRole)),
    );
  }
}
```

**Critérios de Aceite:**
- ✅ Guard carrega papéis do usuário para organização
- ✅ Verificação de hierarquia usa `hasHigherRole()`
- ✅ SUPER_ADMIN ignora verificações de organização
- ✅ Retorna false se ID da organização estiver ausente (para não-super-admin)

---

### Tarefa 2.5: Adicionar Método ao Repositório - getRolesByOrganization()

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Atualizar arquivo: `src/modules/users/domain/repositories/user.repository.interface.ts`
- [ ] Adicionar assinatura do método: `getRolesByOrganization(userId: string, organizationId?: string): Promise<Role[]>`
- [ ] Atualizar arquivo: `src/modules/users/infrastructure/repositories/user.repository.ts`
- [ ] Implementar método com query TypeORM:
  - [ ] Join `users` → `user_roles` → `roles`
  - [ ] Filtrar por `userId` e `organizationId` (se fornecido)
  - [ ] Retornar array de valores enum `Role`
- [ ] Tratar SUPER_ADMIN (papel global, sem filtro de organização)
- [ ] Adicionar cache para performance (opcional)

**Atualização da Interface do Repositório:**
```typescript
export interface IUserRepository extends IBaseRepository<UserEntity> {
  findByEmail(email: string): Promise<UserEntity | null>;
  findBySupabaseUserId(supabaseUserId: string): Promise<UserEntity | null>;
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Obter papéis do usuário para uma organização específica
   * @param userId - ID do Usuário
   * @param organizationId - ID da Organização (opcional para verificação de SUPER_ADMIN)
   * @returns Array de valores enum de papel
   */
  getRolesByOrganization(userId: string, organizationId?: string): Promise<Role[]>;

  /**
   * Encontrar usuários por papéis em uma organização (para notificações de alerta)
   */
  findByRoles(organizationId: string, roles: Role[]): Promise<UserEntity[]>;
}
```

**Implementação do Repositório:**
```typescript
async getRolesByOrganization(userId: string, organizationId?: string): Promise<Role[]> {
  const query = this.repository
    .createQueryBuilder('users')
    .innerJoin('user_roles', 'ur', 'ur.user_id = users.id')
    .innerJoin('roles', 'r', 'r.id = ur.role_id')
    .where('users.id = :userId', { userId });

  // Se ID da organização fornecido, filtrar por ele OU obter papéis do sistema
  if (organizationId) {
    query.andWhere(
      '(ur.organization_id = :organizationId OR r.is_system_role = true)',
      { organizationId },
    );
  } else {
    // Apenas papéis do sistema se nenhuma organização especificada
    query.andWhere('r.is_system_role = true');
  }

  const results = await query.select('r.name', 'roleName').getRawMany();

  return results.map(r => r.roleName as Role);
}

async findByRoles(organizationId: string, roles: Role[]): Promise<UserEntity[]> {
  const schemas = await this.repository
    .createQueryBuilder('users')
    .innerJoin('user_roles', 'ur', 'ur.user_id = users.id')
    .innerJoin('roles', 'r', 'r.id = ur.role_id')
    .where('ur.organization_id = :organizationId', { organizationId })
    .andWhere('r.name IN (:...roles)', { roles })
    .getMany();

  return schemas.map(schema => this.toDomain(schema));
}
```

**Critérios de Aceite:**
- ✅ Método consulta user_roles com join em roles
- ✅ Filtra por ID da organização corretamente
- ✅ Retorna SUPER_ADMIN mesmo sem ID da organização
- ✅ Retorna array de valores enum Role

---

### Tarefa 2.6: Criar Caso de Uso - Atribuir Papel ao Usuário

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar diretório: `src/modules/roles/application/use-cases/`
- [ ] Criar arquivo: `assign-role-to-user.use-case.ts`
- [ ] Injetar `USER_REPOSITORY`, `ROLE_REPOSITORY`, `ORGANIZATION_REPOSITORY`
- [ ] Validar que usuário existe
- [ ] Validar que papel existe
- [ ] Validar que organização existe (se não SUPER_ADMIN)
- [ ] Verificar se usuário já tem papel na organização
- [ ] Criar relacionamento usuário-papel-organização
- [ ] Retornar resposta de sucesso

**Código do Caso de Uso:**
```typescript
import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';
import { IRoleRepository, ROLE_REPOSITORY } from '../../domain/repositories/role.repository.interface';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '@/modules/organizations/domain/repositories/organization.repository.interface';
import { AssignRoleDto } from '../dtos/assign-role.dto';
import { Role } from '../../domain/enums/role.enum';

@Injectable()
export class AssignRoleToUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private userRepository: IUserRepository,
    @Inject(ROLE_REPOSITORY) private roleRepository: IRoleRepository,
    @Inject(ORGANIZATION_REPOSITORY) private organizationRepository: IOrganizationRepository,
  ) {}

  async execute(dto: AssignRoleDto, assignedBy: string): Promise<void> {
    // 1. Validar que usuário existe
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // 2. Validar que papel existe
    const role = await this.roleRepository.findByName(dto.roleName);
    if (!role) {
      throw new NotFoundException('Papel não encontrado');
    }

    // 3. Validar organização (a menos que SUPER_ADMIN)
    if (dto.roleName !== Role.SUPER_ADMIN && !dto.organizationId) {
      throw new BadRequestException('ID da organização necessário para papéis não-super-admin');
    }

    if (dto.organizationId) {
      const organization = await this.organizationRepository.findById(dto.organizationId);
      if (!organization) {
        throw new NotFoundException('Organização não encontrada');
      }
    }

    // 4. Verificar se usuário já tem este papel nesta organização
    const existingRoles = await this.userRepository.getRolesByOrganization(
      dto.userId,
      dto.organizationId,
    );

    if (existingRoles.includes(dto.roleName)) {
      throw new ConflictException('Usuário já tem este papel nesta organização');
    }

    // 5. Atribuir papel
    await this.roleRepository.assignRoleToUser({
      userId: dto.userId,
      roleId: role.id,
      organizationId: dto.organizationId,
      assignedBy,
    });
  }
}
```

**DTO:**
```typescript
import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../domain/enums/role.enum';

export class AssignRoleDto {
  @ApiProperty({ description: 'ID do Usuário' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: Role, description: 'Papel a atribuir' })
  @IsEnum(Role)
  roleName: Role;

  @ApiPropertyOptional({ description: 'ID da Organização (necessário para não-SUPER_ADMIN)' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
```

**Critérios de Aceite:**
- ✅ Caso de uso valida todas as entradas
- ✅ Previne atribuições de papel duplicadas
- ✅ Lança exceções apropriadas
- ✅ Chama repositório para persistir relacionamento

---

### Tarefa 2.7: Atualizar Schema de Papel - Adicionar Campos de Organização

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Atualizar arquivo: `src/modules/roles/infrastructure/persistence/role.schema.ts`
- [ ] Adicionar colunas:
  - [ ] `@Column({ type: 'uuid', nullable: true })` para `organizationId`
  - [ ] `@Column({ type: 'integer', default: 100 })` para `hierarchyLevel`
  - [ ] `@Column({ type: 'boolean', default: false })` para `isSystemRole`
- [ ] Adicionar relação: `@ManyToOne(() => OrganizationSchema)` para organization
- [ ] Atualizar mapper no repositório para tratar novos campos

**Atualização do Schema:**
```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OrganizationSchema } from '@/modules/organizations/infrastructure/persistence/organization.schema';

@Entity('roles')
export class RoleSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true, name: 'organization_id' })
  organizationId: string | null;

  @Column({ type: 'integer', default: 100, name: 'hierarchy_level' })
  hierarchyLevel: number;

  @Column({ type: 'boolean', default: false, name: 'is_system_role' })
  isSystemRole: boolean;

  @ManyToOne(() => OrganizationSchema, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationSchema;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Critérios de Aceite:**
- ✅ Schema corresponde à migração do banco de dados
- ✅ Relação com OrganizationSchema definida
- ✅ Novos campos mapeados corretamente

---

### Tarefa 2.8: Atualizar Schema UserRole - Adicionar Organização

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Atualizar arquivo: `src/modules/roles/infrastructure/persistence/user-role.schema.ts`
- [ ] Adicionar coluna `organizationId`
- [ ] Adicionar relação com `OrganizationSchema`
- [ ] Atualizar restrição única para incluir organização
- [ ] Atualizar repositório para filtrar por organização

**Atualização do Schema:**
```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Unique } from 'typeorm';
import { UserSchema } from '@/modules/users/infrastructure/persistence/user.schema';
import { RoleSchema } from './role.schema';
import { OrganizationSchema } from '@/modules/organizations/infrastructure/persistence/organization.schema';

@Entity('user_roles')
@Unique('user_roles_unique', ['userId', 'roleId', 'organizationId'])
export class UserRoleSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'role_id' })
  roleId: string;

  @Column({ type: 'uuid', nullable: true, name: 'organization_id' })
  organizationId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'assigned_by' })
  assignedBy: string | null;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;

  @ManyToOne(() => UserSchema)
  @JoinColumn({ name: 'user_id' })
  user: UserSchema;

  @ManyToOne(() => RoleSchema)
  @JoinColumn({ name: 'role_id' })
  role: RoleSchema;

  @ManyToOne(() => OrganizationSchema, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationSchema;
}
```

**Critérios de Aceite:**
- ✅ Schema corresponde à migração
- ✅ Restrição única inclui organização
- ✅ Relações definidas corretamente

---

### Tarefa 2.9: Testes Unitários - Lógica de Hierarquia de Papéis

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/roles/domain/enums/role.enum.spec.ts`
- [ ] Testar função `hasHigherRole()`:
  - [ ] Admin pode fazer o que Gestor faz
  - [ ] Gestor pode fazer o que Colaborador faz
  - [ ] Colaborador não pode fazer tarefas de Admin
  - [ ] Super Admin pode fazer tudo
- [ ] Testar função `getSubordinateRoles()`
- [ ] Testar casos extremos

**Código de Teste:**
```typescript
import { Role, hasHigherRole, getSubordinateRoles } from './role.enum';

describe('Hierarquia de Papéis', () => {
  describe('hasHigherRole', () => {
    it('deve retornar true para Admin acessando funcionalidade de Gestor', () => {
      expect(hasHigherRole(Role.ADMIN, Role.GESTOR)).toBe(true);
    });

    it('deve retornar true para Gestor acessando funcionalidade de Colaborador', () => {
      expect(hasHigherRole(Role.GESTOR, Role.COLABORADOR)).toBe(true);
    });

    it('deve retornar false para Colaborador acessando funcionalidade de Admin', () => {
      expect(hasHigherRole(Role.COLABORADOR, Role.ADMIN)).toBe(false);
    });

    it('deve retornar true para Super Admin acessando qualquer papel', () => {
      expect(hasHigherRole(Role.SUPER_ADMIN, Role.ADMIN)).toBe(true);
      expect(hasHigherRole(Role.SUPER_ADMIN, Role.GESTOR)).toBe(true);
      expect(hasHigherRole(Role.SUPER_ADMIN, Role.COLABORADOR)).toBe(true);
    });

    it('deve retornar true para mesmo nível de papel', () => {
      expect(hasHigherRole(Role.ADMIN, Role.ADMIN)).toBe(true);
    });
  });

  describe('getSubordinateRoles', () => {
    it('deve retornar todos os papéis com privilégio igual ou menor', () => {
      const subordinates = getSubordinateRoles(Role.GESTOR);
      expect(subordinates).toContain(Role.GESTOR);
      expect(subordinates).toContain(Role.COLABORADOR);
      expect(subordinates).not.toContain(Role.ADMIN);
    });
  });
});
```

**Critérios de Aceite:**
- ✅ Todos os testes de hierarquia passam
- ✅ Casos extremos cobertos
- ✅ Cobertura de teste ≥80%

---

### Tarefa 2.10: Testes Unitários - RolesGuard Aprimorado

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/core/presentation/guards/roles.guard.spec.ts`
- [ ] Mockar `UserRepository.getRolesByOrganization()`
- [ ] Testar cenários:
  - [ ] Usuário com papel ADMIN pode acessar rota protegida por GESTOR
  - [ ] Usuário com papel COLABORADOR não pode acessar rota protegida por ADMIN
  - [ ] SUPER_ADMIN ignora verificação de organização
  - [ ] ID de organização ausente nega acesso (exceto SUPER_ADMIN)
  - [ ] Nenhum papel requerido permite acesso
- [ ] Testar se guard retorna boolean correto

**Código de Teste:**
```typescript
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '@/modules/roles/domain/enums/role.enum';
import { IUserRepository } from '@/modules/users/domain/repositories/user.repository.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    reflector = new Reflector();
    mockUserRepository = {
      getRolesByOrganization: jest.fn(),
    } as any;

    guard = new RolesGuard(reflector, mockUserRepository);
  });

  it('deve permitir acesso se nenhum papel for requerido', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

    const context = createMockContext({}, {});
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('deve permitir ADMIN acessar rota protegida por GESTOR', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.GESTOR]);
    mockUserRepository.getRolesByOrganization.mockResolvedValue([Role.ADMIN]);

    const context = createMockContext({ id: 'user-123' }, { 'x-organization-id': 'org-456' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('deve negar COLABORADOR acesso a rota protegida por ADMIN', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    mockUserRepository.getRolesByOrganization.mockResolvedValue([Role.COLABORADOR]);

    const context = createMockContext({ id: 'user-123' }, { 'x-organization-id': 'org-456' });
    const result = await guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('deve permitir SUPER_ADMIN sem ID de organização', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    mockUserRepository.getRolesByOrganization.mockResolvedValue([Role.SUPER_ADMIN]);

    const context = createMockContext({ id: 'user-123' }, {});
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });
});
```

**Critérios de Aceite:**
- ✅ Todos os testes do guard passam
- ✅ Lógica de hierarquia testada
- ✅ Contexto de organização testado

---

### Tarefa 2.11: Testes de Integração - Atribuição de Papel

**Prioridade:** 🟢 Média
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `test/roles.integration.spec.ts`
- [ ] Configurar banco de dados de teste com organizações e usuários
- [ ] Testar fluxo de atribuição de papel:
  - [ ] Atribuir papel ADMIN ao usuário na organização A
  - [ ] Atribuir papel GESTOR ao mesmo usuário na organização B
  - [ ] Verificar que usuário tem papéis diferentes em orgs diferentes
  - [ ] Verificar que papel SUPER_ADMIN funciona globalmente
- [ ] Testar prevenção de atribuição duplicada

**Critérios de Aceite:**
- ✅ Testes de integração passam
- ✅ Atribuição de papel multi-organização funciona
- ✅ Prevenção de duplicação funciona

---

### Tarefa 2.12: Testes E2E - Autorização RBAC

**Prioridade:** 🟢 Média
**Tempo Estimado:** 4 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `test/rbac.e2e-spec.ts`
- [ ] Criar usuários de teste com diferentes papéis
- [ ] Testar autorização de endpoint:
  - [ ] ADMIN pode acessar endpoint exclusivo de admin
  - [ ] GESTOR pode acessar endpoint exclusivo de gestor mas não de admin
  - [ ] COLABORADOR pode acessar endpoint exclusivo de colaborador mas não gestor/admin
  - [ ] SUPER_ADMIN pode acessar todos os endpoints
- [ ] Testar isolamento de organização (usuário com ADMIN na Org A não pode acessar dados da Org B)
- [ ] Testar respostas 403 Forbidden

**Critérios de Aceite:**
- ✅ Todos os testes E2E passam
- ✅ Autorização aplicada corretamente
- ✅ Isolamento de organização verificado

---

## Definição de Pronto

O Marco 2 está completo quando:

- ✅ **Migração do Banco de Dados:** Tabelas RBAC atualizadas com organization_id e hierarchy_level
- ✅ **Enum de Papel:** Papéis hierárquicos definidos com funções auxiliares
- ✅ **Permissões:** Permissões do Emociograma definidas e mapeadas para papéis
- ✅ **RolesGuard:** Aprimorado para verificar papéis com escopo de organização e hierarquia
- ✅ **Repositório:** Método `getRolesByOrganization()` implementado
- ✅ **Casos de Uso:** Caso de uso de atribuição de papel funcional
- ✅ **Testes:** Cobertura ≥80% (unitário + integração + E2E)
- ✅ **Validação:** Sistema RBAC aplica hierarquia e escopo de organização

---

## Dependências para Próximos Marcos

- **Marco 3 (Emociograma Core):** Requer RolesGuard para aplicar permissões
- **Marco 4 (Sistema de Alertas):** Requer `findByRoles()` para notificar Gestores/Admins

---

## Matriz de Permissões de Referência

| Ação | Colaborador | Gestor | Admin | Super Admin |
|------|-------------|--------|-------|-------------|
| Enviar própria emoção | ✅ | ✅ | ✅ | ✅ |
| Ver próprio histórico | ✅ | ✅ | ✅ | ✅ |
| Ver agregado da equipe | ❌ | ✅ | ✅ | ✅ |
| Ver lista anonimizada da equipe | ❌ | ✅ | ✅ | ✅ |
| Ver submissões identificadas | ❌ | ❌ | ✅ | ✅ |
| Exportar dados da equipe | ❌ | ✅ | ✅ | ✅ |
| Exportar dados da org | ❌ | ❌ | ✅ | ✅ |
| Configurar alertas | ❌ | ❌ | ✅ | ✅ |
| Gerenciar categorias | ❌ | ❌ | ✅ | ✅ |
| Configurações de organização | ❌ | ❌ | ✅ | ✅ |
| Criar organizações | ❌ | ❌ | ❌ | ✅ |

---

## Recursos

- [Conceitos de RBAC](https://pt.wikipedia.org/wiki/Controle_de_acesso_baseado_em_fun%C3%A7%C3%A3o)
- [Documentação de Guards do NestJS](https://docs.nestjs.com/guards)
- [Relações do TypeORM](https://typeorm.io/relations)
