# Milestone 1: Fundação Multi-Tenant

**Cronograma:** Semana 1

**Dependências:** Nenhuma

**Status:** 🔴 Não Iniciado

---

## Visão Geral

Construir a arquitetura fundamental multi-tenant com isolamento baseado em organizações. Este marco estabelece a entidade principal de organização, o padrão repository, o middleware para injeção de contexto de tenant e operações CRUD.

**Entregável Principal:** Organizações podem ser criadas, configuradas e isoladas umas das outras.

---

## Detalhamento de Tarefas

### Tarefa 1.1: Esquema do Banco de Dados - Tabela Organizations

**Prioridade:** 🔴 Crítica

**Tempo Estimado:** 2 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar arquivo de migration: `src/core/infrastructure/database/migrations/[timestamp]-CreateOrganizationsTable.ts`
* [ ] Definir esquema da tabela com as colunas: `id`, `name`, `slug`, `type`, `settings`, `parent_id`, `is_active`, timestamps
* [ ] Adicionar restrição de verificação (check constraint): `type IN ('company', 'department', 'team')`
* [ ] Criar índices:
* [ ] `idx_organizations_slug` em `slug` (restrição única)
* [ ] `idx_organizations_parent_id` em `parent_id`
* [ ] `idx_organizations_is_active` em `is_active` ONDE `deleted_at IS NULL`


* [ ] Adicionar chave estrangeira: `parent_id` REFERENCIA `organizations(id)` ON DELETE SET NULL
* [ ] Testar migration: Executar `npm run typeorm migration:run`
* [ ] Testar rollback: Executar `npm run typeorm migration:revert`

**Esquema SQL:**

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('company', 'department', 'team')),
  settings JSONB DEFAULT '{}',
  parent_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_parent_id ON organizations(parent_id);
CREATE INDEX idx_organizations_is_active ON organizations(is_active) WHERE deleted_at IS NULL;

```

**Critérios de Aceite:**

* ✅ Migration executada com sucesso sem erros
* ✅ Tabela criada com todas as colunas e restrições
* ✅ Índices criados e consultáveis
* ✅ Migration pode ser revertida de forma limpa

---

### Tarefa 1.2: Interface de Configurações da Organização

**Prioridade:** 🟡 Alta

**Tempo Estimado:** 1 hora

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar arquivo de definição de tipos: `src/modules/organizations/domain/types/organization-settings.types.ts`
* [ ] Definir interface `OrganizationSettings` com as propriedades:
* [ ] `timezone: string` (ex: "America/Sao_Paulo")
* [ ] `locale: string` (ex: "pt-BR")
* [ ] `emociogramaEnabled: boolean` (padrão: true)
* [ ] `alertThreshold: number` (padrão: 6)
* [ ] `dataRetentionDays: number` (padrão: 365, conformidade LGPD)
* [ ] `anonymityDefault: boolean` (padrão: false)


* [ ] Adicionar comentários JSDoc para cada propriedade
* [ ] Criar função factory para configurações padrão

**Interface TypeScript:**

```typescript
/**
 * Configurações específicas da organização para recursos e conformidade
 */
export interface OrganizationSettings {
  /** Fuso horário para exibição de data/hora (identificador IANA) */
  timezone: string;

  /** Localidade para internacionalização (tag de idioma BCP 47) */
  locale: string;

  /** Ativar/desativar o recurso Emociograma para esta organização */
  emociogramaEnabled: boolean;

  /** Limite do estado emocional para disparar alertas (escala 1-10) */
  alertThreshold: number;

  /** Período de retenção de dados em dias (conformidade LGPD) */
  dataRetentionDays: number;

  /** Configuração padrão de anonimato para envios */
  anonymityDefault: boolean;
}

/**
 * Configurações padrão da organização
 */
export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  timezone: 'America/Sao_Paulo',
  locale: 'pt-BR',
  emociogramaEnabled: true,
  alertThreshold: 6,
  dataRetentionDays: 365,
  anonymityDefault: false,
};

```

**Critérios de Aceite:**

* ✅ Interface compila sem erros de TypeScript
* ✅ Todas as propriedades possuem documentação JSDoc clara
* ✅ Função factory de configurações padrão retorna um objeto válido

---

### Tarefa 1.3: Camada de Domínio - Entidade Organization

**Prioridade:** 🔴 Crítica

**Tempo Estimado:** 3 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar diretório: `src/modules/organizations/domain/entities/`
* [ ] Criar arquivo: `organization.entity.ts`
* [ ] Estender a classe `BaseEntity` (de `src/core/domain/entities/base.entity.ts`)
* [ ] Definir propriedades correspondentes ao esquema do banco de dados
* [ ] Implementar método factory estático `create()` com validação
* [ ] Implementar método `updateSettings()`
* [ ] Implementar método `deactivate()` (soft delete)
* [ ] Implementar método utilitário `generateSlug()` (normalizar string → slug)
* [ ] Adicionar validação de negócio:
* [ ] Nome deve ter entre 3-100 caracteres
* [ ] Tipo deve ser um valor válido do enum
* [ ] Limite de alerta deve ser entre 1-10
* [ ] Retenção de dados deve ser entre 1-3650 dias



**Código da Entidade:**

```typescript
import { BaseEntity } from '@/core/domain/entities/base.entity';
import { OrganizationSettings, DEFAULT_ORGANIZATION_SETTINGS } from '../types/organization-settings.types';
import { ValidationException } from '@/core/domain/exceptions/validation.exception';

export class OrganizationEntity extends BaseEntity {
  name: string;
  slug: string;
  type: 'company' | 'department' | 'team';
  settings: OrganizationSettings;
  parentId?: string;
  isActive: boolean;

  static create(data: {
    name: string;
    type: 'company' | 'department' | 'team';
    settings?: Partial<OrganizationSettings>;
    parentId?: string;
  }): OrganizationEntity {
    // Validar nome
    if (!data.name || data.name.length < 3 || data.name.length > 100) {
      throw new ValidationException('O nome da organização deve ter entre 3 e 100 caracteres');
    }

    // Validar tipo
    if (!['company', 'department', 'team'].includes(data.type)) {
      throw new ValidationException('Tipo de organização inválido');
    }

    return new OrganizationEntity({
      name: data.name,
      slug: this.generateSlug(data.name),
      type: data.type,
      settings: { ...DEFAULT_ORGANIZATION_SETTINGS, ...data.settings },
      parentId: data.parentId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  updateSettings(partial: Partial<OrganizationSettings>): void {
    // Validar limite de alerta
    if (partial.alertThreshold !== undefined) {
      if (partial.alertThreshold < 1 || partial.alertThreshold > 10) {
        throw new ValidationException('O limite de alerta deve estar entre 1 e 10');
      }
    }

    // Validar retenção de dados
    if (partial.dataRetentionDays !== undefined) {
      if (partial.dataRetentionDays < 1 || partial.dataRetentionDays > 3650) {
        throw new ValidationException('A retenção de dados deve estar entre 1 e 3650 dias');
      }
    }

    this.settings = { ...this.settings, ...partial };
    this.touch(); // Atualiza o timestamp updatedAt
  }

  deactivate(): void {
    this.isActive = false;
    this.markAsDeleted(); // Define o timestamp deletedAt (soft delete)
  }

  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '-') // Substitui não-alfanuméricos por hífen
      .replace(/^-+|-+$/g, ''); // Remove hífens no início/fim
  }
}

```

**Critérios de Aceite:**

* ✅ Entidade estende BaseEntity corretamente
* ✅ Método `create()` valida entrada e retorna entidade válida
* ✅ `generateSlug()` lida com caracteres especiais e acentos
* ✅ `updateSettings()` valida valores de limite e retenção
* ✅ `deactivate()` marca a entidade como excluída logicamente (soft-delete)

---

### Tarefa 1.4: Interface do Repositório

**Prioridade:** 🔴 Crítica

**Tempo Estimado:** 1 hora

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar diretório: `src/modules/organizations/domain/repositories/`
* [ ] Criar arquivo: `organization.repository.interface.ts`
* [ ] Estender a interface `IBaseRepository<OrganizationEntity>`
* [ ] Definir métodos customizados:
* [ ] `findBySlug(slug: string): Promise<OrganizationEntity | null>`
* [ ] `findChildren(parentId: string): Promise<OrganizationEntity[]>`
* [ ] `findActiveByType(type: string): Promise<OrganizationEntity[]>`


* [ ] Criar token de injeção: `ORGANIZATION_REPOSITORY`

**Código da Interface:**

```typescript
import { IBaseRepository } from '@/core/domain/repositories/base.repository.interface';
import { OrganizationEntity } from '../entities/organization.entity';

/**
 * Interface de repositório para operações de persistência de organização
 */
export interface IOrganizationRepository extends IBaseRepository<OrganizationEntity> {
  /**
   * Buscar organização por slug único
   */
  findBySlug(slug: string): Promise<OrganizationEntity | null>;

  /**
   * Buscar todas as organizações filhas de um pai
   */
  findChildren(parentId: string): Promise<OrganizationEntity[]>;

  /**
   * Buscar todas as organizações ativas por tipo
   */
  findActiveByType(type: 'company' | 'department' | 'team'): Promise<OrganizationEntity[]>;
}

/**
 * Token de injeção de dependência para IOrganizationRepository
 */
export const ORGANIZATION_REPOSITORY = Symbol('IOrganizationRepository');

```

**Critérios de Aceite:**

* ✅ Interface estende IBaseRepository
* ✅ Todos os métodos customizados possuem comentários JSDoc
* ✅ Token de injeção é exportado
* ✅ Sem erros de compilação TypeScript

---

### Tarefa 1.5: Esquema TypeORM

**Prioridade:** 🔴 Crítica

**Tempo Estimado:** 2 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar diretório: `src/modules/organizations/infrastructure/persistence/`
* [ ] Criar arquivo: `organization.schema.ts`
* [ ] Definir a classe TypeORM `@Entity('organizations')`
* [ ] Mapear todas as colunas com os decoradores apropriados:
* [ ] `@PrimaryGeneratedColumn('uuid')` para `id`
* [ ] `@Column()` para campos de string com restrições de tamanho
* [ ] `@Column({ type: 'jsonb', default: {} })` para `settings`
* [ ] `@Column({ type: 'boolean', default: true })` para `isActive`
* [ ] Colunas de timestamp com `@CreateDateColumn()`, `@UpdateDateColumn()`, `@DeleteDateColumn()`


* [ ] Adicionar decoradores `@Index()` para slug, parentId, isActive

**Código do Esquema:**

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { OrganizationSettings } from '../../domain/types/organization-settings.types';

@Entity('organizations')
export class OrganizationSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index('idx_organizations_slug')
  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'company' | 'department' | 'team';

  @Column({ type: 'jsonb', default: {} })
  settings: OrganizationSettings;

  @Index('idx_organizations_parent_id')
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @Index('idx_organizations_is_active')
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}

```

**Critérios de Aceite:**

* ✅ Esquema mapeia para a tabela `organizations`
* ✅ Todas as colunas decoradas corretamente
* ✅ Índices correspondem à migration
* ✅ Tipos TypeScript correspondem à entidade

---

### Tarefa 1.6: Implementação do Repositório

**Prioridade:** 🔴 Crítica

**Tempo Estimado:** 4 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar diretório: `src/modules/organizations/infrastructure/repositories/`
* [ ] Criar arquivo: `organization.repository.ts`
* [ ] Estender `TypeOrmBaseRepository<OrganizationSchema, OrganizationEntity>`
* [ ] Injetar `@InjectRepository(OrganizationSchema)`
* [ ] Implementar métodos de mapeamento (mapper):
* [ ] `toDomain(schema: OrganizationSchema): OrganizationEntity`
* [ ] `toEntity(domain: Partial<OrganizationEntity>): OrganizationSchema`


* [ ] Implementar métodos customizados do repositório:
* [ ] `findBySlug()`
* [ ] `findChildren()`
* [ ] `findActiveByType()`


* [ ] Adicionar tratamento de erro para operações de banco de dados

**Código do Repositório:**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmBaseRepository } from '@/core/infrastructure/repositories/typeorm-base.repository';
import { OrganizationSchema } from '../persistence/organization.schema';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';

@Injectable()
export class OrganizationRepository
  extends TypeOrmBaseRepository<OrganizationSchema, OrganizationEntity>
  implements IOrganizationRepository
{
  constructor(
    @InjectRepository(OrganizationSchema)
    repository: Repository<OrganizationSchema>,
  ) {
    super(repository);
  }

  // Mapper: Esquema → Domínio
  toDomain(schema: OrganizationSchema): OrganizationEntity {
    return new OrganizationEntity({
      id: schema.id,
      name: schema.name,
      slug: schema.slug,
      type: schema.type,
      settings: schema.settings,
      parentId: schema.parentId ?? undefined,
      isActive: schema.isActive,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
      deletedAt: schema.deletedAt ?? undefined,
    });
  }

  // Mapper: Domínio → Esquema
  toEntity(domain: Partial<OrganizationEntity>): OrganizationSchema {
    const schema = new OrganizationSchema();
    if (domain.id) schema.id = domain.id;
    if (domain.name) schema.name = domain.name;
    if (domain.slug) schema.slug = domain.slug;
    if (domain.type) schema.type = domain.type;
    if (domain.settings) schema.settings = domain.settings;
    if (domain.parentId !== undefined) schema.parentId = domain.parentId ?? null;
    if (domain.isActive !== undefined) schema.isActive = domain.isActive;
    return schema;
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const schema = await this.repository.findOne({ where: { slug } });
    return schema ? this.toDomain(schema) : null;
  }

  async findChildren(parentId: string): Promise<OrganizationEntity[]> {
    const schemas = await this.repository.find({
      where: { parentId, deletedAt: null },
      order: { createdAt: 'ASC' },
    });
    return schemas.map(schema => this.toDomain(schema));
  }

  async findActiveByType(type: 'company' | 'department' | 'team'): Promise<OrganizationEntity[]> {
    const schemas = await this.repository.find({
      where: { type, isActive: true, deletedAt: null },
      order: { name: 'ASC' },
    });
    return schemas.map(schema => this.toDomain(schema));
  }
}

```

**Critérios de Aceite:**

* ✅ Repositório estende TypeOrmBaseRepository
* ✅ Métodos mapper convertem entre esquema e domínio
* ✅ Métodos customizados consultam o banco corretamente
* ✅ Registros excluídos logicamente (soft-deleted) são filtrados

---

### Tarefa 1.7: Casos de Uso - Operações CRUD

**Prioridade:** 🟡 Alta

**Tempo Estimado:** 4 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar diretório: `src/modules/organizations/application/use-cases/`
* [ ] Criar arquivos de casos de uso:
* [ ] `create-organization.use-case.ts`
* [ ] `get-organization-by-id.use-case.ts`
* [ ] `update-organization-settings.use-case.ts`
* [ ] `delete-organization.use-case.ts`
* [ ] `list-organizations.use-case.ts`


* [ ] Injetar `ORGANIZATION_REPOSITORY` em cada caso de uso
* [ ] Implementar lógica de negócio com validação
* [ ] Adicionar tratamento de erros (NotFoundException, ConflictException, etc.)

**Exemplo: CreateOrganizationUseCase**

```typescript
import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(dto: CreateOrganizationDto): Promise<OrganizationEntity> {
    // Verificar se o slug já existe
    const existingOrg = await this.organizationRepository.findBySlug(
      OrganizationEntity.generateSlug(dto.name),
    );

    if (existingOrg) {
      throw new ConflictException('Uma organização com este nome já existe');
    }

    // Validar organização pai se fornecida
    if (dto.parentId) {
      const parent = await this.organizationRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException('Organização pai não encontrada');
      }
    }

    // Criar entidade de domínio
    const organization = OrganizationEntity.create({
      name: dto.name,
      type: dto.type,
      settings: dto.settings,
      parentId: dto.parentId,
    });

    // Persistir
    return this.organizationRepository.create(organization);
  }
}

```

**Critérios de Aceite:**

* ✅ Todos os 5 casos de uso implementados
* ✅ Validação de negócio em vigor
* ✅ Exceções apropriadas lançadas
* ✅ Repositório injetado corretamente

---

### Tarefa 1.8: DTOs (Data Transfer Objects)

**Prioridade:** 🟡 Alta

**Tempo Estimado:** 2 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar diretório: `src/modules/organizations/application/dtos/`
* [ ] Criar arquivos DTO:
* [ ] `create-organization.dto.ts` (com decoradores class-validator)
* [ ] `update-organization-settings.dto.ts`
* [ ] `organization-response.dto.ts`


* [ ] Adicionar decoradores de validação: `@IsString()`, `@IsEnum()`, `@IsOptional()`, etc.
* [ ] Adicionar decoradores do Swagger: `@ApiProperty()`

**Exemplo: CreateOrganizationDto**

```typescript
import { IsString, IsEnum, IsOptional, MinLength, MaxLength, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationSettings } from '../../domain/types/organization-settings.types';

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Nome da organização', minLength: 3, maxLength: 100 })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: ['company', 'department', 'team'], description: 'Tipo da organização' })
  @IsEnum(['company', 'department', 'team'])
  type: 'company' | 'department' | 'team';

  @ApiPropertyOptional({ description: 'Configurações da organização' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationSettings)
  settings?: Partial<OrganizationSettings>;

  @ApiPropertyOptional({ description: 'ID da organização pai' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

```

**Critérios de Aceite:**

* ✅ Todos os DTOs possuem decoradores de validação
* ✅ Anotações Swagger presentes
* ✅ Validação funciona com o ValidationPipe

---

### Tarefa 1.9: Controller de Organizações

**Prioridade:** 🟡 Alta

**Tempo Estimado:** 3 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar diretório: `src/modules/organizations/presentation/controllers/`
* [ ] Criar arquivo: `organizations.controller.ts`
* [ ] Adicionar decoradores de rota: `@Controller('organizations')`
* [ ] Aplicar guards: `@UseGuards(JwtAuthGuard, RolesGuard)`
* [ ] Implementar endpoints:
* [ ] `POST /organizations` - Criar (Apenas SUPER_ADMIN)
* [ ] `GET /organizations/:id` - Obter por ID (ADMIN)
* [ ] `GET /organizations` - Listar com paginação (ADMIN)
* [ ] `PATCH /organizations/:id/settings` - Atualizar configurações (ADMIN)
* [ ] `DELETE /organizations/:id` - Soft delete (Apenas SUPER_ADMIN)


* [ ] Adicionar tags Swagger e descrições de operação
* [ ] Envolver respostas em `ApiResponseDto`

**Código do Controller:**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/presentation/guards/roles.guard';
import { Roles } from '@/core/presentation/decorators/roles.decorator';
import { Role } from '@/modules/roles/domain/enums/role.enum';
import { ApiResponseDto } from '@/core/application/dtos/api-response.dto';
import { CreateOrganizationUseCase } from '../../application/use-cases/create-organization.use-case';
import { CreateOrganizationDto } from '../../application/dtos/create-organization.dto';
import { OrganizationEntity } from '../../domain/entities/organization.entity';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Organizations')
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    // ... injetar outros casos de uso
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Criar nova organização' })
  @ApiResponse({ status: 201, description: 'Organização criada com sucesso' })
  async create(@Body() dto: CreateOrganizationDto): Promise<ApiResponseDto<OrganizationEntity>> {
    const organization = await this.createOrganizationUseCase.execute(dto);
    return ApiResponseDto.success(organization);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obter organização por ID' })
  async getById(@Param('id') id: string): Promise<ApiResponseDto<OrganizationEntity>> {
    const organization = await this.getByIdUseCase.execute(id);
    return ApiResponseDto.success(organization);
  }

  // ... outros endpoints
}

```

**Critérios de Aceite:**

* ✅ Todos os endpoints implementados
* ✅ Guards e roles aplicados corretamente
* ✅ Documentação Swagger completa
* ✅ Resposta envolvida em ApiResponseDto

---

### Tarefa 1.10: Middleware de Contexto da Organização

**Prioridade:** 🔴 Crítica

**Tempo Estimado:** 3 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar arquivo: `src/core/presentation/middleware/organization-context.middleware.ts`
* [ ] Implementar interface `NestMiddleware`
* [ ] Extrair `x-organization-id` dos headers da requisição
* [ ] Validar se a organização existe e está ativa
* [ ] Injetar `organizationContext` no objeto da requisição (Request)
* [ ] Lidar com erros (UnauthorizedException para organização inválida)
* [ ] Registrar middleware no `AppModule` para todas as rotas

**Código do Middleware:**

```typescript
import { Injectable, NestMiddleware, UnauthorizedException, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '@/modules/organizations/domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '@/modules/organizations/domain/entities/organization.entity';

declare global {
  namespace Express {
    interface Request {
      organizationContext?: OrganizationEntity;
    }
  }
}

@Injectable()
export class OrganizationContextMiddleware implements NestMiddleware {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const organizationId = req.headers['x-organization-id'] as string;

    // ID da organização é opcional (alguns endpoints não exigem)
    if (!organizationId) {
      return next();
    }

    // Validar se a organização existe e está ativa
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new UnauthorizedException('Organização não encontrada');
    }

    if (!organization.isActive) {
      throw new UnauthorizedException('Organização está inativa');
    }

    // Injetar contexto da organização na requisição
    req.organizationContext = organization;

    next();
  }
}

```

**Registro no AppModule:**

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { OrganizationContextMiddleware } from '@/core/presentation/middleware/organization-context.middleware';

@Module({
  // ... outras configs
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(OrganizationContextMiddleware)
      .forRoutes('*'); // Aplicar a todas as rotas
  }
}

```

**Critérios de Aceite:**

* ✅ Middleware extrai e valida o ID da organização
* ✅ Contexto da organização injetado na requisição
* ✅ Erros lançados para organizações inválidas/inativas
* ✅ Middleware registrado globalmente no AppModule

---

### Tarefa 1.11: Montagem do Módulo de Organizações

**Prioridade:** 🟡 Alta

**Tempo Estimado:** 2 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar arquivo: `src/modules/organizations/organizations.module.ts`
* [ ] Importar `TypeOrmModule.forFeature([OrganizationSchema])`
* [ ] Registrar todos os providers:
* [ ] Repositório (provide: ORGANIZATION_REPOSITORY, useClass: OrganizationRepository)
* [ ] Todos os casos de uso


* [ ] Exportar controller
* [ ] Adicionar OrganizationsModule aos imports do AppModule

**Código do Módulo:**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationSchema } from './infrastructure/persistence/organization.schema';
import { OrganizationRepository } from './infrastructure/repositories/organization.repository';
import { ORGANIZATION_REPOSITORY } from './domain/repositories/organization.repository.interface';
import { CreateOrganizationUseCase } from './application/use-cases/create-organization.use-case';
import { GetOrganizationByIdUseCase } from './application/use-cases/get-organization-by-id.use-case';
import { UpdateOrganizationSettingsUseCase } from './application/use-cases/update-organization-settings.use-case';
import { DeleteOrganizationUseCase } from './application/use-cases/delete-organization.use-case';
import { ListOrganizationsUseCase } from './application/use-cases/list-organizations.use-case';
import { OrganizationsController } from './presentation/controllers/organizations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationSchema])],
  providers: [
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: OrganizationRepository,
    },
    CreateOrganizationUseCase,
    GetOrganizationByIdUseCase,
    UpdateOrganizationSettingsUseCase,
    DeleteOrganizationUseCase,
    ListOrganizationsUseCase,
  ],
  controllers: [OrganizationsController],
  exports: [ORGANIZATION_REPOSITORY], // Exportar para outros módulos
})
export class OrganizationsModule {}

```

**Critérios de Aceite:**

* ✅ Todos os providers registrados
* ✅ Repositório exportado para uso em outros módulos
* ✅ Módulo importa recurso TypeORM
* ✅ Módulo adicionado ao AppModule

---

### Tarefa 1.12: Testes Unitários - Entidade Organization

**Prioridade:** 🟡 Alta

**Tempo Estimado:** 3 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar arquivo: `src/modules/organizations/domain/entities/organization.entity.spec.ts`
* [ ] Testar método factory `create()`:
* [ ] Entrada válida cria entidade
* [ ] Nome inválido lança ValidationException
* [ ] Tipo inválido lança ValidationException
* [ ] Geração de slug funciona corretamente


* [ ] Testar `updateSettings()`:
* [ ] Atualizações válidas mesclam configurações
* [ ] Limite (threshold) inválido lança erro
* [ ] Retenção inválida lança erro


* [ ] Testar `deactivate()`:
* [ ] Define isActive como false
* [ ] Define timestamp deletedAt



**Critérios de Aceite:**

* ✅ Todos os testes passam
* ✅ Cobertura ≥80% para a entidade
* ✅ Casos de borda (edge cases) testados

---

### Tarefa 1.13: Testes Unitários - Casos de Uso

**Prioridade:** 🟡 Alta

**Tempo Estimado:** 4 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar arquivos de teste para cada caso de uso
* [ ] Mockar `IOrganizationRepository` com jest.fn()
* [ ] Testar cenários de sucesso e erro (NotFoundException, ConflictException)
* [ ] Verificar se os métodos do repositório são chamados corretamente

**Critérios de Aceite:**

* ✅ Todos os testes de caso de uso passam
* ✅ Cobertura ≥80% para cada caso de uso
* ✅ Mocks configurados corretamente

---

### Tarefa 1.14: Testes de Integração - Repositório

**Prioridade:** 🟢 Média

**Tempo Estimado:** 3 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar teste de integração para o repositório
* [ ] Configurar conexão com banco de dados de teste
* [ ] Testar métodos do repositório contra banco real (Create, findBySlug, findChildren, findActiveByType)
* [ ] Limpar dados de teste após cada execução

**Critérios de Aceite:**

* ✅ Testes de integração passam com banco de dados real
* ✅ Dados de teste limpos adequadamente

---

### Tarefa 1.15: Testes E2E - API de Organizações

**Prioridade:** 🟢 Média

**Tempo Estimado:** 4 horas

**Responsável:** Desenvolvedor Backend

**Subtarefas:**

* [ ] Criar arquivo: `test/organizations.e2e-spec.ts`
* [ ] Configurar app de teste e autenticação
* [ ] Testar fluxos completos da API (POST, GET, PATCH, DELETE)
* [ ] Testar autorização (roles SUPER_ADMIN, ADMIN)
* [ ] Testar erros de validação (respostas 400) e não encontrado (respostas 404)

**Critérios de Aceite:**

* ✅ Todos os testes E2E passam
* ✅ Autorização testada
* ✅ Tratamento de erro testado

---

## Definição de Pronto (Definition of Done)

O Milestone 1 está completo quando:

* ✅ **Migration:** Tabela de organizações criada com todos os índices.
* ✅ **Camada de Domínio:** Entidade com lógica de negócio e validação.
* ✅ **Repositório:** Interface + implementação TypeORM com consultas customizadas.
* ✅ **Casos de Uso:** Todos os 5 casos de uso CRUD implementados.
* ✅ **API:** Controller com todos os endpoints.
* ✅ **Middleware:** Middleware de contexto registrado globalmente.
* ✅ **Módulo:** OrganizationsModule montado e adicionado ao AppModule.
* ✅ **Testes:** ≥80% de cobertura de código (unitário + integração + E2E).
* ✅ **Documentação:** Docs Swagger completos.
* ✅ **Validação:** Todos os endpoints validam entrada com DTOs.

---

## Dependências para Próximos Milestones

Os seguintes marcos dependem da conclusão deste:

* **Milestone 2 (RBAC Avançado):** Exige tabela `organizations` e chave estrangeira `organization_id`.
* **Milestone 3 (Core Emociograma):** Exige middleware de contexto de organização.
* **Milestone 4 (Sistema de Alertas):** Exige consultas com escopo de organização.

---

## Recursos

* [Documentação NestJS Modules](https://docs.nestjs.com/modules)
* [Padrão Repository no TypeORM](https://typeorm.io/custom-repository)
* [Princípios de Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
* [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)

---
