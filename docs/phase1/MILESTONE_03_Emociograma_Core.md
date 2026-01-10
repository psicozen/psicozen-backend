# Marco 3: Módulo Core do Emociograma

**Cronograma:** Semana 2-3
**Dependências:** Marco 1 (Organizations), Marco 2 (Enhanced RBAC)
**Status:** 🔴 Não Iniciado

---

## Visão Geral

Construir o recurso core do Emociograma: rastreamento diário de estado emocional com escala de 10 níveis, submissões baseadas em categorias, anonimato opcional e moderação de comentários. Este é o coração do sistema PsicoZen.

**Entregável Principal:** Funcionários podem enviar emoções diárias com controles completos de privacidade, gestores podem visualizar dados agregados.

---

## Detalhamento de Tarefas

### Tarefa 3.1: Migração do Banco de Dados - Tabelas do Emociograma

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo de migração: `src/core/infrastructure/database/migrations/[timestamp]-CreateEmociogramaTable.ts`
- [ ] Criar tabela `emociograma_categories` com 10 categorias predefinidas
- [ ] Criar tabela `emociograma_submissions` com todos os campos
- [ ] Criar índices para performance:
  - [ ] `idx_emociograma_org_user` índice composto
  - [ ] `idx_emociograma_org_date` para consultas baseadas em tempo
  - [ ] `idx_emociograma_emotion_level` para detecção de alertas
  - [ ] `idx_emociograma_category` para relatórios por categoria
  - [ ] `idx_emociograma_anonymous` para filtragem de anonimato
  - [ ] `idx_emociograma_department` e `idx_emociograma_team` para agregações
- [ ] Adicionar restrição de verificação: `emotion_level BETWEEN 1 AND 10`
- [ ] Inserir categorias padrão
- [ ] Testar migração e rollback

**Migração SQL:**
```sql
-- Categorias de emoção (tabela de consulta predefinida)
CREATE TABLE emociograma_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- emoji ou nome de ícone
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO emociograma_categories (name, slug, display_order) VALUES
  ('Pessoal', 'pessoal', 1),
  ('Trabalho', 'trabalho', 2),
  ('Família', 'familia', 3),
  ('Saúde', 'saude', 4),
  ('Financeiro', 'financeiro', 5),
  ('Relacionamento/Social', 'relacionamento_social', 6),
  ('Intelectual', 'intelectual', 7),
  ('Emocional/Psicológico', 'emocional_psicologico', 8),
  ('Estilo de Vida', 'estilo_vida', 9),
  ('Outros', 'outros', 10);

-- Tabela principal de submissões
CREATE TABLE emociograma_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Estado emocional (escala 1-10)
  emotion_level INTEGER NOT NULL CHECK (emotion_level BETWEEN 1 AND 10),
  emotion_emoji VARCHAR(10) NOT NULL,

  -- Categoria
  category_id UUID NOT NULL REFERENCES emociograma_categories(id),

  -- Controle de privacidade (funcionário escolhe)
  is_anonymous BOOLEAN NOT NULL DEFAULT false,

  -- Comentário opcional
  comment TEXT,
  comment_flagged BOOLEAN DEFAULT false, -- Para moderação

  -- Metadados (desnormalizado para performance de relatórios)
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  department VARCHAR(100), -- Departamento do usuário no momento da submissão
  team VARCHAR(100),       -- Equipe do usuário no momento da submissão

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Índices de performance
CREATE INDEX idx_emociograma_org_user ON emociograma_submissions(organization_id, user_id);
CREATE INDEX idx_emociograma_org_date ON emociograma_submissions(organization_id, submitted_at);
CREATE INDEX idx_emociograma_emotion_level ON emociograma_submissions(emotion_level);
CREATE INDEX idx_emociograma_category ON emociograma_submissions(category_id);
CREATE INDEX idx_emociograma_anonymous ON emociograma_submissions(is_anonymous);
CREATE INDEX idx_emociograma_department ON emociograma_submissions(organization_id, department);
CREATE INDEX idx_emociograma_team ON emociograma_submissions(organization_id, team);

-- Índice parcial apenas para submissões ativas (consciente de soft delete)
CREATE INDEX idx_emociograma_active ON emociograma_submissions(organization_id, submitted_at)
  WHERE deleted_at IS NULL;
```

**Critérios de Aceite:**
- ✅ Ambas as tabelas criadas com sucesso
- ✅ 10 categorias inseridas
- ✅ Todos os índices criados
- ✅ Restrição de verificação aplicada
- ✅ Migração pode ser revertida

---

### Tarefa 3.2: Entidade de Domínio - EmociogramaCategory

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/domain/entities/category.entity.ts`
- [ ] Estender `BaseEntity`
- [ ] Definir propriedades: `name`, `slug`, `description`, `icon`, `displayOrder`, `isActive`
- [ ] Implementar método factory estático `create()`
- [ ] Implementar métodos `activate()` e `deactivate()`
- [ ] Implementar utilitário `generateSlug()`

**Código da Entidade:**
```typescript
import { BaseEntity } from '@/core/domain/entities/base.entity';

export class EmociogramaCategoryEntity extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;

  static create(data: {
    name: string;
    description?: string;
    icon?: string;
    displayOrder: number;
  }): EmociogramaCategoryEntity {
    return new EmociogramaCategoryEntity({
      name: data.name,
      slug: this.generateSlug(data.name),
      description: data.description,
      icon: data.icon,
      displayOrder: data.displayOrder,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  activate(): void {
    this.isActive = true;
    this.touch();
  }

  deactivate(): void {
    this.isActive = false;
    this.touch();
  }

  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
```

**Critérios de Aceite:**
- ✅ Entidade estende BaseEntity
- ✅ Método factory valida entrada
- ✅ Geração de slug lida com caracteres especiais

---

### Tarefa 3.3: Entidade de Domínio - EmociogramaSubmission

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 4 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/domain/entities/submission.entity.ts`
- [ ] Estender `BaseEntity`
- [ ] Definir todas as propriedades correspondentes ao schema
- [ ] Implementar factory estático `create()` com validação:
  - [ ] Nível de emoção deve ser 1-10
  - [ ] ID da categoria obrigatório
  - [ ] ID da organização obrigatório
- [ ] Implementar lógica de negócio `shouldTriggerAlert()` (emotion_level >= 6)
- [ ] Implementar `maskIdentity()` para submissões anônimas
- [ ] Implementar função de mapeamento `getEmojiForLevel()`
- [ ] Adicionar validação de negócio para comprimento do comentário

**Código da Entidade:**
```typescript
import { BaseEntity } from '@/core/domain/entities/base.entity';
import { ValidationException } from '@/core/domain/exceptions/validation.exception';

export interface CreateSubmissionData {
  organizationId: string;
  userId: string;
  emotionLevel: number;
  categoryId: string;
  isAnonymous: boolean;
  comment?: string;
  department?: string;
  team?: string;
}

export class EmociogramaSubmissionEntity extends BaseEntity {
  organizationId: string;
  userId: string;
  emotionLevel: number; // 1-10
  emotionEmoji: string;
  categoryId: string;
  isAnonymous: boolean;
  comment?: string;
  commentFlagged: boolean;
  submittedAt: Date;
  department?: string;
  team?: string;

  static create(data: CreateSubmissionData): EmociogramaSubmissionEntity {
    // Validar nível de emoção (1-10)
    if (data.emotionLevel < 1 || data.emotionLevel > 10) {
      throw new ValidationException('Nível de emoção deve estar entre 1 e 10');
    }

    // Validar comprimento do comentário (máx 1000 caracteres)
    if (data.comment && data.comment.length > 1000) {
      throw new ValidationException('Comentário não deve exceder 1000 caracteres');
    }

    return new EmociogramaSubmissionEntity({
      organizationId: data.organizationId,
      userId: data.userId,
      emotionLevel: data.emotionLevel,
      emotionEmoji: this.getEmojiForLevel(data.emotionLevel),
      categoryId: data.categoryId,
      isAnonymous: data.isAnonymous,
      comment: data.comment,
      commentFlagged: false,
      submittedAt: new Date(),
      department: data.department,
      team: data.team,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Determinar se esta submissão deve disparar um alerta
   * Limite: emotion_level >= 6 (emoções negativas)
   */
  shouldTriggerAlert(): boolean {
    return this.emotionLevel >= 6;
  }

  /**
   * Mascarar identidade do usuário para submissões anônimas
   * Preserva departamento/equipe para agregação mas esconde ID do usuário
   */
  maskIdentity(): Partial<EmociogramaSubmissionEntity> {
    if (!this.isAnonymous) {
      return this;
    }

    return {
      ...this,
      userId: 'anonymous', // Esconder ID real do usuário
      comment: this.comment, // Manter comentário (já moderado)
      department: this.department, // Manter para agregação
      team: this.team, // Manter para agregação
    };
  }

  /**
   * Mapear nível de emoção (1-10) para emoji
   * 1-5: Emoções positivas (feliz até neutro)
   * 6-10: Emoções negativas (cansado até muito triste)
   */
  private static getEmojiForLevel(level: number): string {
    const emojiMap: Record<number, string> = {
      1: '😄', // Muito feliz
      2: '🙂', // Feliz
      3: '😌', // Satisfeito
      4: '😐', // Neutro
      5: '😕', // Levemente irritado
      6: '😫', // Cansado (LIMITE DE ALERTA)
      7: '😢', // Triste
      8: '😣', // Estressado
      9: '😟', // Ansioso
      10: '😞', // Muito triste/deprimido
    };

    return emojiMap[level] || '😐';
  }

  /**
   * Sinalizar comentário para revisão de moderação
   */
  flagComment(): void {
    this.commentFlagged = true;
    this.touch();
  }
}
```

**Critérios de Aceite:**
- ✅ Entidade valida faixa de nível de emoção
- ✅ `shouldTriggerAlert()` retorna true para >= 6
- ✅ `maskIdentity()` esconde ID do usuário mas preserva departamento/equipe
- ✅ Mapeamento de emoji cobre todos os 10 níveis

---

### Tarefa 3.4: Interface do Repositório - Submission

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/domain/repositories/submission.repository.interface.ts`
- [ ] Estender `IBaseRepository<EmociogramaSubmissionEntity>`
- [ ] Definir métodos de consulta customizados:
  - [ ] `findByUser()` - Obter histórico de submissões do usuário
  - [ ] `getAggregatedByTimeRange()` - Dados agregados para relatórios
  - [ ] `findSubmissionsAboveThreshold()` - Detecção de alertas
  - [ ] `getMostMotivated()` - Analytics
  - [ ] `getLeastMotivated()` - Analytics
  - [ ] `getByDepartment()` - Relatórios de departamento
  - [ ] `getByTeam()` - Relatórios de equipe
- [ ] Definir tipos para respostas de dados agregados
- [ ] Criar token de injeção

**Interface do Repositório:**
```typescript
import { IBaseRepository } from '@/core/domain/repositories/base.repository.interface';
import { EmociogramaSubmissionEntity } from '../entities/submission.entity';
import { PaginatedResult, FindOptions } from '@/core/application/dtos/pagination.dto';

export interface AggregationFilters {
  department?: string;
  team?: string;
  categoryId?: string;
  minEmotionLevel?: number;
  maxEmotionLevel?: number;
}

export interface AggregatedData {
  totalSubmissions: number;
  averageEmotionLevel: number;
  distributionByLevel: Record<number, number>; // { 1: 15, 2: 30, ... }
  distributionByCategory: Record<string, number>; // { 'trabalho': 45, ... }
  anonymousCount: number;
  identifiedCount: number;
  trendData: { date: string; avgLevel: number }[]; // Médias diárias
}

export interface UserMotivationScore {
  userId: string;
  averageEmotionLevel: number;
  submissionCount: number;
  lastSubmittedAt: Date;
}

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface IEmociogramaSubmissionRepository extends IBaseRepository<EmociogramaSubmissionEntity> {
  /**
   * Encontrar submissões por usuário com paginação
   */
  findByUser(
    userId: string,
    organizationId: string,
    options?: FindOptions,
  ): Promise<PaginatedResult<EmociogramaSubmissionEntity>>;

  /**
   * Obter dados agregados para intervalo de tempo com filtros opcionais
   */
  getAggregatedByTimeRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: AggregationFilters,
  ): Promise<AggregatedData>;

  /**
   * Encontrar submissões acima do limite de emoção (para alertas)
   */
  findSubmissionsAboveThreshold(
    organizationId: string,
    threshold: number,
    since: Date,
  ): Promise<EmociogramaSubmissionEntity[]>;

  /**
   * Obter usuários mais motivados (menores níveis médios de emoção)
   */
  getMostMotivated(organizationId: string, limit: number): Promise<UserMotivationScore[]>;

  /**
   * Obter usuários menos motivados (maiores níveis médios de emoção)
   */
  getLeastMotivated(organizationId: string, limit: number): Promise<UserMotivationScore[]>;

  /**
   * Obter dados agregados por departamento
   */
  getByDepartment(
    organizationId: string,
    department: string,
    timeRange: TimeRange,
  ): Promise<AggregatedData>;

  /**
   * Obter dados agregados por equipe
   */
  getByTeam(
    organizationId: string,
    team: string,
    timeRange: TimeRange,
  ): Promise<AggregatedData>;

  /**
   * Deletar todas as submissões do usuário (direito LGPD ao apagamento)
   */
  deleteByUser(userId: string, organizationId: string): Promise<void>;

  /**
   * Anonimizar todas as submissões do usuário (anonimização de dados LGPD)
   */
  anonymizeByUser(userId: string, organizationId: string): Promise<void>;
}

export const EMOCIOGRAMA_SUBMISSION_REPOSITORY = Symbol('IEmociogramaSubmissionRepository');
```

**Critérios de Aceite:**
- ✅ Interface estende IBaseRepository
- ✅ Todos os métodos de consulta definidos
- ✅ Tipos de agregação definidos
- ✅ Métodos LGPD incluídos

---

### Tarefa 3.5: Schemas TypeORM

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar diretório: `src/modules/emociograma/infrastructure/persistence/`
- [ ] Criar `category.schema.ts`
- [ ] Criar `submission.schema.ts`
- [ ] Mapear todas as colunas com decoradores TypeORM
- [ ] Definir relações (ManyToOne para Organization, User, Category)
- [ ] Adicionar índices correspondentes à migração

**Schema de Submission:**
```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { OrganizationSchema } from '@/modules/organizations/infrastructure/persistence/organization.schema';
import { UserSchema } from '@/modules/users/infrastructure/persistence/user.schema';
import { EmociogramaCategorySchema } from './category.schema';

@Entity('emociograma_submissions')
export class EmociogramaSubmissionSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_emociograma_org_user')
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Index('idx_emociograma_org_user')
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Index('idx_emociograma_emotion_level')
  @Column({ type: 'integer', name: 'emotion_level' })
  emotionLevel: number;

  @Column({ type: 'varchar', length: 10, name: 'emotion_emoji' })
  emotionEmoji: string;

  @Index('idx_emociograma_category')
  @Column({ type: 'uuid', name: 'category_id' })
  categoryId: string;

  @Index('idx_emociograma_anonymous')
  @Column({ type: 'boolean', default: false, name: 'is_anonymous' })
  isAnonymous: boolean;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'boolean', default: false, name: 'comment_flagged' })
  commentFlagged: boolean;

  @Index('idx_emociograma_org_date')
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'submitted_at' })
  submittedAt: Date;

  @Index('idx_emociograma_department')
  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Index('idx_emociograma_team')
  @Column({ type: 'varchar', length: 100, nullable: true })
  team: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  // Relações
  @ManyToOne(() => OrganizationSchema)
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationSchema;

  @ManyToOne(() => UserSchema)
  @JoinColumn({ name: 'user_id' })
  user: UserSchema;

  @ManyToOne(() => EmociogramaCategorySchema)
  @JoinColumn({ name: 'category_id' })
  category: EmociogramaCategorySchema;
}
```

**Critérios de Aceite:**
- ✅ Ambos os schemas criados
- ✅ Todas as colunas mapeadas
- ✅ Relações definidas
- ✅ Índices correspondem à migração

---

### Tarefa 3.6: Implementação do Repositório - Submission

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 6 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/infrastructure/repositories/submission.repository.ts`
- [ ] Estender `TypeOrmBaseRepository`
- [ ] Implementar métodos mapper (`toDomain`, `toEntity`)
- [ ] Implementar todos os métodos de consulta customizados
- [ ] Usar TypeORM QueryBuilder para agregações complexas
- [ ] Adicionar tratamento de erros para erros de banco de dados
- [ ] Otimizar consultas com índices apropriados

**Implementação do Repositório (Métodos Principais):**
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmBaseRepository } from '@/core/infrastructure/repositories/typeorm-base.repository';
import { EmociogramaSubmissionSchema } from '../persistence/submission.schema';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { IEmociogramaSubmissionRepository, AggregatedData, UserMotivationScore, TimeRange, AggregationFilters } from '../../domain/repositories/submission.repository.interface';
import { PaginatedResult, FindOptions } from '@/core/application/dtos/pagination.dto';

@Injectable()
export class EmociogramaSubmissionRepository
  extends TypeOrmBaseRepository<EmociogramaSubmissionSchema, EmociogramaSubmissionEntity>
  implements IEmociogramaSubmissionRepository
{
  constructor(
    @InjectRepository(EmociogramaSubmissionSchema)
    repository: Repository<EmociogramaSubmissionSchema>,
  ) {
    super(repository);
  }

  // Mappers
  toDomain(schema: EmociogramaSubmissionSchema): EmociogramaSubmissionEntity {
    return new EmociogramaSubmissionEntity({
      id: schema.id,
      organizationId: schema.organizationId,
      userId: schema.userId,
      emotionLevel: schema.emotionLevel,
      emotionEmoji: schema.emotionEmoji,
      categoryId: schema.categoryId,
      isAnonymous: schema.isAnonymous,
      comment: schema.comment ?? undefined,
      commentFlagged: schema.commentFlagged,
      submittedAt: schema.submittedAt,
      department: schema.department ?? undefined,
      team: schema.team ?? undefined,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
      deletedAt: schema.deletedAt ?? undefined,
    });
  }

  toEntity(domain: Partial<EmociogramaSubmissionEntity>): EmociogramaSubmissionSchema {
    const schema = new EmociogramaSubmissionSchema();
    Object.assign(schema, domain);
    return schema;
  }

  // Consultas customizadas
  async findByUser(
    userId: string,
    organizationId: string,
    options?: FindOptions,
  ): Promise<PaginatedResult<EmociogramaSubmissionEntity>> {
    const queryBuilder = this.repository
      .createQueryBuilder('submissions')
      .where('submissions.user_id = :userId', { userId })
      .andWhere('submissions.organization_id = :organizationId', { organizationId })
      .andWhere('submissions.deleted_at IS NULL')
      .orderBy('submissions.submitted_at', 'DESC');

    // Aplicar paginação
    if (options?.limit) {
      queryBuilder.take(options.limit);
    }
    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    const [schemas, total] = await queryBuilder.getManyAndCount();

    return {
      data: schemas.map(s => this.toDomain(s)),
      total,
      page: options?.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1,
      limit: options?.limit || 10,
    };
  }

  async getAggregatedByTimeRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: AggregationFilters,
  ): Promise<AggregatedData> {
    let queryBuilder = this.repository
      .createQueryBuilder('submissions')
      .where('submissions.organization_id = :organizationId', { organizationId })
      .andWhere('submissions.submitted_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('submissions.deleted_at IS NULL');

    // Aplicar filtros
    if (filters?.department) {
      queryBuilder = queryBuilder.andWhere('submissions.department = :department', {
        department: filters.department,
      });
    }
    if (filters?.team) {
      queryBuilder = queryBuilder.andWhere('submissions.team = :team', { team: filters.team });
    }
    if (filters?.categoryId) {
      queryBuilder = queryBuilder.andWhere('submissions.category_id = :categoryId', {
        categoryId: filters.categoryId,
      });
    }
    if (filters?.minEmotionLevel) {
      queryBuilder = queryBuilder.andWhere('submissions.emotion_level >= :minLevel', {
        minLevel: filters.minEmotionLevel,
      });
    }
    if (filters?.maxEmotionLevel) {
      queryBuilder = queryBuilder.andWhere('submissions.emotion_level <= :maxLevel', {
        maxLevel: filters.maxEmotionLevel,
      });
    }

    // Executar agregações
    const [totalSubmissions, averageResult, distributionByLevel, distributionByCategory, anonymityCount, trendData] =
      await Promise.all([
        queryBuilder.getCount(),
        queryBuilder.select('AVG(submissions.emotion_level)', 'avg').getRawOne(),
        queryBuilder
          .select('submissions.emotion_level', 'level')
          .addSelect('COUNT(*)', 'count')
          .groupBy('submissions.emotion_level')
          .getRawMany(),
        queryBuilder
          .select('submissions.category_id', 'categoryId')
          .addSelect('COUNT(*)', 'count')
          .groupBy('submissions.category_id')
          .getRawMany(),
        queryBuilder
          .select('submissions.is_anonymous', 'isAnonymous')
          .addSelect('COUNT(*)', 'count')
          .groupBy('submissions.is_anonymous')
          .getRawMany(),
        queryBuilder
          .select("DATE(submissions.submitted_at)", 'date')
          .addSelect('AVG(submissions.emotion_level)', 'avgLevel')
          .groupBy('DATE(submissions.submitted_at)')
          .orderBy('DATE(submissions.submitted_at)', 'ASC')
          .getRawMany(),
      ]);

    // Processar resultados
    const distributionByLevelMap: Record<number, number> = {};
    distributionByLevel.forEach(row => {
      distributionByLevelMap[row.level] = parseInt(row.count, 10);
    });

    const distributionByCategoryMap: Record<string, number> = {};
    distributionByCategory.forEach(row => {
      distributionByCategoryMap[row.categoryId] = parseInt(row.count, 10);
    });

    const anonymousCountValue = anonymityCount.find(row => row.isAnonymous === true)?.count || 0;
    const identifiedCountValue = anonymityCount.find(row => row.isAnonymous === false)?.count || 0;

    return {
      totalSubmissions,
      averageEmotionLevel: parseFloat(averageResult?.avg || '0'),
      distributionByLevel: distributionByLevelMap,
      distributionByCategory: distributionByCategoryMap,
      anonymousCount: parseInt(anonymousCountValue, 10),
      identifiedCount: parseInt(identifiedCountValue, 10),
      trendData: trendData.map(row => ({
        date: row.date,
        avgLevel: parseFloat(row.avgLevel),
      })),
    };
  }

  async findSubmissionsAboveThreshold(
    organizationId: string,
    threshold: number,
    since: Date,
  ): Promise<EmociogramaSubmissionEntity[]> {
    const schemas = await this.repository.find({
      where: {
        organizationId,
        emotionLevel: threshold, // TypeORM não tem GreaterThanOrEqual simples, use Between
        submittedAt: since, // Mesmo aqui
        deletedAt: null as any,
      },
      order: { submittedAt: 'DESC' },
    });

    return schemas.map(s => this.toDomain(s));
  }

  async getMostMotivated(organizationId: string, limit: number): Promise<UserMotivationScore[]> {
    const results = await this.repository
      .createQueryBuilder('submissions')
      .select('submissions.user_id', 'userId')
      .addSelect('AVG(submissions.emotion_level)', 'avgLevel')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(submissions.submitted_at)', 'lastSubmittedAt')
      .where('submissions.organization_id = :organizationId', { organizationId })
      .andWhere('submissions.deleted_at IS NULL')
      .groupBy('submissions.user_id')
      .orderBy('avgLevel', 'ASC') // Menor = mais motivado
      .limit(limit)
      .getRawMany();

    return results.map(row => ({
      userId: row.userId,
      averageEmotionLevel: parseFloat(row.avgLevel),
      submissionCount: parseInt(row.count, 10),
      lastSubmittedAt: row.lastSubmittedAt,
    }));
  }

  async getLeastMotivated(organizationId: string, limit: number): Promise<UserMotivationScore[]> {
    const results = await this.repository
      .createQueryBuilder('submissions')
      .select('submissions.user_id', 'userId')
      .addSelect('AVG(submissions.emotion_level)', 'avgLevel')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(submissions.submitted_at)', 'lastSubmittedAt')
      .where('submissions.organization_id = :organizationId', { organizationId })
      .andWhere('submissions.deleted_at IS NULL')
      .groupBy('submissions.user_id')
      .orderBy('avgLevel', 'DESC') // Maior = menos motivado
      .limit(limit)
      .getRawMany();

    return results.map(row => ({
      userId: row.userId,
      averageEmotionLevel: parseFloat(row.avgLevel),
      submissionCount: parseInt(row.count, 10),
      lastSubmittedAt: row.lastSubmittedAt,
    }));
  }

  async getByDepartment(
    organizationId: string,
    department: string,
    timeRange: TimeRange,
  ): Promise<AggregatedData> {
    return this.getAggregatedByTimeRange(organizationId, timeRange.startDate, timeRange.endDate, {
      department,
    });
  }

  async getByTeam(
    organizationId: string,
    team: string,
    timeRange: TimeRange,
  ): Promise<AggregatedData> {
    return this.getAggregatedByTimeRange(organizationId, timeRange.startDate, timeRange.endDate, {
      team,
    });
  }

  async deleteByUser(userId: string, organizationId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .from(EmociogramaSubmissionSchema)
      .where('user_id = :userId', { userId })
      .andWhere('organization_id = :organizationId', { organizationId })
      .execute();
  }

  async anonymizeByUser(userId: string, organizationId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(EmociogramaSubmissionSchema)
      .set({ isAnonymous: true, comment: null })
      .where('user_id = :userId', { userId })
      .andWhere('organization_id = :organizationId', { organizationId })
      .execute();
  }
}
```

**Critérios de Aceite:**
- ✅ Todos os métodos do repositório implementados
- ✅ Consultas de agregação otimizadas
- ✅ Mappers tratam todos os campos corretamente
- ✅ Métodos LGPD funcionam corretamente

---

### Tarefa 3.7: Caso de Uso - Enviar Emociograma

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 4 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/application/use-cases/submit-emociograma.use-case.ts`
- [ ] Injetar repositórios: `EMOCIOGRAMA_SUBMISSION_REPOSITORY`, `ORGANIZATION_REPOSITORY`, `USER_REPOSITORY`
- [ ] Injetar serviços: `CommentModerationService`, `AlertService`
- [ ] Validar configurações da organização (emociogramaEnabled)
- [ ] Moderar comentário se presente
- [ ] Obter departamento/equipe do usuário da entidade user
- [ ] Criar entidade de submissão
- [ ] Persistir submissão
- [ ] Disparar alerta se emoção >= limite (async)
- [ ] Retornar submissão mascarada se anônima

**Código do Caso de Uso:**
```typescript
import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { IEmociogramaSubmissionRepository, EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '@/modules/organizations/domain/repositories/organization.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { SubmitEmociogramaDto } from '../dtos/submit-emociograma.dto';
import { CommentModerationService } from '../services/comment-moderation.service';
import { IAlertService, ALERT_SERVICE } from '../services/alert.service.interface';

@Injectable()
export class SubmitEmociogramaUseCase {
  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly moderationService: CommentModerationService,
    @Inject(ALERT_SERVICE)
    private readonly alertService: IAlertService,
  ) {}

  async execute(
    dto: SubmitEmociogramaDto,
    userId: string,
    organizationId: string,
  ): Promise<EmociogramaSubmissionEntity> {
    // 1. Validar configurações da organização
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization?.settings.emociogramaEnabled) {
      throw new ForbiddenException('Emociograma está desabilitado para esta organização');
    }

    // 2. Obter detalhes do usuário (para departamento/equipe)
    const user = await this.userRepository.findById(userId);

    // 3. Moderar comentário se presente
    let sanitizedComment = dto.comment;
    if (dto.comment) {
      const moderation = await this.moderationService.moderateComment(dto.comment);
      sanitizedComment = moderation.sanitizedComment;

      // Se comentário foi sinalizado, marcar para revisão
      if (moderation.isFlagged) {
        // Flag será definida na entidade
      }
    }

    // 4. Criar entidade de submissão
    const submission = EmociogramaSubmissionEntity.create({
      organizationId,
      userId,
      emotionLevel: dto.emotionLevel,
      categoryId: dto.categoryId,
      isAnonymous: dto.isAnonymous,
      comment: sanitizedComment,
      department: user?.department, // Do perfil do usuário
      team: user?.team, // Do perfil do usuário
    });

    // Sinalizar comentário se foi moderado
    if (dto.comment && sanitizedComment !== dto.comment) {
      submission.flagComment();
    }

    // 5. Persistir submissão
    const saved = await this.submissionRepository.create(submission);

    // 6. Verificar disparo de alerta (async - não bloquear resposta)
    if (saved.shouldTriggerAlert()) {
      // Fire and forget (processamento assíncrono)
      this.alertService.triggerEmotionalAlert(saved).catch(error => {
        console.error('Falha ao disparar alerta:', error);
      });
    }

    // 7. Retornar mascarado se anônimo
    if (dto.isAnonymous) {
      return saved.maskIdentity() as EmociogramaSubmissionEntity;
    }

    return saved;
  }
}
```

**DTO:**
```typescript
import { IsInt, Min, Max, IsUUID, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitEmociogramaDto {
  @ApiProperty({ description: 'Nível de emoção (1-10)', minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  emotionLevel: number;

  @ApiProperty({ description: 'ID da Categoria' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: 'Enviar anonimamente', default: false })
  @IsBoolean()
  isAnonymous: boolean;

  @ApiPropertyOptional({ description: 'Comentário opcional', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
```

**Critérios de Aceite:**
- ✅ Caso de uso valida configurações da organização
- ✅ Comentários são moderados
- ✅ Alertas disparados assincronamente
- ✅ Submissões anônimas mascaradas
- ✅ Departamento/equipe capturados do usuário

---

### Tarefa 3.8: Caso de Uso - Obter Relatório Agregado

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/application/use-cases/get-aggregated-report.use-case.ts`
- [ ] Injetar `EMOCIOGRAMA_SUBMISSION_REPOSITORY`
- [ ] Chamar método de agregação do repositório
- [ ] Calcular estatísticas resumidas
- [ ] Calcular tendências (diárias/semanais)
- [ ] Calcular percentuais de distribuição
- [ ] Identificar padrões de alerta
- [ ] Retornar relatório estruturado

**Código do Caso de Uso:**
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { IEmociogramaSubmissionRepository, EMOCIOGRAMA_SUBMISSION_REPOSITORY, AggregatedData } from '../../domain/repositories/submission.repository.interface';
import { AggregatedReportDto } from '../dtos/aggregated-report.dto';

export interface AggregatedReportResponse {
  summary: {
    totalSubmissions: number;
    averageEmotionLevel: number;
    motivationScore: number; // 0-100 (nível de emoção invertido)
    anonymityRate: number; // % anônimo
  };
  trends: {
    direction: 'improving' | 'stable' | 'declining';
    dailyAverages: { date: string; avgLevel: number }[];
  };
  distribution: {
    byLevel: { level: number; count: number; percentage: number }[];
    byCategory: { categoryId: string; count: number; percentage: number }[];
  };
  alerts: {
    totalAlertsTriggered: number; // Submissões >= limite
    criticalCount: number; // >= 9
    highCount: number; // 7-8
    mediumCount: number; // 6
  };
}

@Injectable()
export class GetAggregatedReportUseCase {
  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
  ) {}

  async execute(dto: AggregatedReportDto, organizationId: string): Promise<AggregatedReportResponse> {
    // Obter dados agregados do repositório
    const data = await this.submissionRepository.getAggregatedByTimeRange(
      organizationId,
      dto.startDate,
      dto.endDate,
      {
        department: dto.department,
        team: dto.team,
        categoryId: dto.categoryId,
      },
    );

    // Calcular resumo
    const summary = {
      totalSubmissions: data.totalSubmissions,
      averageEmotionLevel: data.averageEmotionLevel,
      motivationScore: this.calculateMotivationScore(data.averageEmotionLevel),
      anonymityRate: data.totalSubmissions > 0
        ? (data.anonymousCount / data.totalSubmissions) * 100
        : 0,
    };

    // Calcular tendências
    const trends = {
      direction: this.calculateTrendDirection(data.trendData),
      dailyAverages: data.trendData,
    };

    // Calcular percentuais de distribuição
    const distribution = {
      byLevel: Object.entries(data.distributionByLevel).map(([level, count]) => ({
        level: parseInt(level, 10),
        count,
        percentage: (count / data.totalSubmissions) * 100,
      })),
      byCategory: Object.entries(data.distributionByCategory).map(([categoryId, count]) => ({
        categoryId,
        count,
        percentage: (count / data.totalSubmissions) * 100,
      })),
    };

    // Calcular estatísticas de alerta
    const alerts = this.calculateAlertStatistics(data.distributionByLevel);

    return {
      summary,
      trends,
      distribution,
      alerts,
    };
  }

  private calculateMotivationScore(averageEmotionLevel: number): number {
    // Inverter nível de emoção para pontuação de motivação (1=100%, 10=0%)
    return Math.round((11 - averageEmotionLevel) / 10 * 100);
  }

  private calculateTrendDirection(trendData: { date: string; avgLevel: number }[]): 'improving' | 'stable' | 'declining' {
    if (trendData.length < 2) return 'stable';

    const recentAvg = trendData.slice(-3).reduce((sum, d) => sum + d.avgLevel, 0) / 3;
    const olderAvg = trendData.slice(0, 3).reduce((sum, d) => sum + d.avgLevel, 0) / 3;

    if (recentAvg < olderAvg - 0.5) return 'improving'; // Menor emoção = melhor
    if (recentAvg > olderAvg + 0.5) return 'declining'; // Maior emoção = pior
    return 'stable';
  }

  private calculateAlertStatistics(distributionByLevel: Record<number, number>) {
    const criticalCount = (distributionByLevel[9] || 0) + (distributionByLevel[10] || 0);
    const highCount = (distributionByLevel[7] || 0) + (distributionByLevel[8] || 0);
    const mediumCount = distributionByLevel[6] || 0;

    return {
      totalAlertsTriggered: criticalCount + highCount + mediumCount,
      criticalCount,
      highCount,
      mediumCount,
    };
  }
}
```

**DTO:**
```typescript
import { IsDate, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AggregatedReportDto {
  @ApiProperty({ description: 'Data de início (ISO 8601)', type: String })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: 'Data de fim (ISO 8601)', type: String })
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiPropertyOptional({ description: 'Filtrar por departamento' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Filtrar por equipe' })
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID da categoria' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
```

**Critérios de Aceite:**
- ✅ Caso de uso calcula todas as estatísticas
- ✅ Pontuação de motivação invertida corretamente
- ✅ Direção da tendência calculada
- ✅ Estatísticas de alerta precisas

---

### Tarefa 3.9: Serviço - Moderação de Comentários

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/application/services/comment-moderation.service.ts`
- [ ] Definir padrões de palavras inapropriadas (regex)
- [ ] Implementar método `moderateComment()`
- [ ] Sanitizar comentários sinalizados (substituir por ***)
- [ ] Retornar resultado de moderação com status de flag
- [ ] Tornar padrões configuráveis via configurações de organização (futuro)

**Código do Serviço:**
```typescript
import { Injectable } from '@nestjs/common';

export interface ModerationResult {
  isFlagged: boolean;
  sanitizedComment: string;
  reason?: string;
}

@Injectable()
export class CommentModerationService {
  private inappropriatePatterns: RegExp[] = [
    // Profanidade em português (exemplos - adicionar mais conforme necessário)
    /\b(palavra1|palavra2|palavra3)\b/gi,
    // Padrões ofensivos genéricos
    /\b(hate|kill|die|stupid|idiot)\b/gi,
    // Maiúsculas excessivas (gritando)
    /[A-Z]{10,}/g,
  ];

  async moderateComment(comment: string): Promise<ModerationResult> {
    if (!comment || comment.trim().length === 0) {
      return {
        isFlagged: false,
        sanitizedComment: comment,
      };
    }

    let flagged = false;
    let reason: string | undefined;

    // Verificar padrões inapropriados
    for (const pattern of this.inappropriatePatterns) {
      if (pattern.test(comment)) {
        flagged = true;
        reason = 'inappropriate_language';
        break;
      }
    }

    // Sanitizar se sinalizado
    const sanitizedComment = flagged ? this.sanitize(comment) : comment;

    return {
      isFlagged: flagged,
      sanitizedComment,
      reason,
    };
  }

  private sanitize(comment: string): string {
    let sanitized = comment;

    // Substituir palavras inapropriadas por asteriscos
    this.inappropriatePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, match => '*'.repeat(match.length));
    });

    return sanitized;
  }
}
```

**Critérios de Aceite:**
- ✅ Serviço detecta padrões inapropriados
- ✅ Sanitização substitui palavras por ***
- ✅ Retorna resultado de moderação

---

### Tarefa 3.10: Testes Unitários - Entidades de Domínio

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 4 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivos de teste:
  - [ ] `category.entity.spec.ts`
  - [ ] `submission.entity.spec.ts`
- [ ] Testar `EmociogramaSubmissionEntity.create()`:
  - [ ] Dados válidos criam entidade
  - [ ] Nível de emoção inválido lança erro
  - [ ] Comentário longo lança erro
- [ ] Testar `shouldTriggerAlert()`:
  - [ ] Retorna true para >= 6
  - [ ] Retorna false para < 6
- [ ] Testar `maskIdentity()`:
  - [ ] Mascara ID do usuário para anônimo
  - [ ] Preserva departamento/equipe
  - [ ] Retorna sem modificação para não-anônimo
- [ ] Testar `getEmojiForLevel()`:
  - [ ] Retorna emoji correto para cada nível

**Exemplo de Teste:**
```typescript
import { EmociogramaSubmissionEntity } from './submission.entity';
import { ValidationException } from '@/core/domain/exceptions/validation.exception';

describe('EmociogramaSubmissionEntity', () => {
  describe('create', () => {
    it('deve criar submissão com dados válidos', () => {
      const submission = EmociogramaSubmissionEntity.create({
        organizationId: 'org-123',
        userId: 'user-456',
        emotionLevel: 5,
        categoryId: 'cat-789',
        isAnonymous: false,
      });

      expect(submission.emotionLevel).toBe(5);
      expect(submission.emotionEmoji).toBe('😕');
    });

    it('deve lançar erro para nível de emoção abaixo de 1', () => {
      expect(() =>
        EmociogramaSubmissionEntity.create({
          organizationId: 'org-123',
          userId: 'user-456',
          emotionLevel: 0,
          categoryId: 'cat-789',
          isAnonymous: false,
        }),
      ).toThrow(ValidationException);
    });

    it('deve lançar erro para nível de emoção acima de 10', () => {
      expect(() =>
        EmociogramaSubmissionEntity.create({
          organizationId: 'org-123',
          userId: 'user-456',
          emotionLevel: 11,
          categoryId: 'cat-789',
          isAnonymous: false,
        }),
      ).toThrow(ValidationException);
    });
  });

  describe('shouldTriggerAlert', () => {
    it('deve retornar true para nível de emoção 6', () => {
      const submission = EmociogramaSubmissionEntity.create({
        organizationId: 'org-123',
        userId: 'user-456',
        emotionLevel: 6,
        categoryId: 'cat-789',
        isAnonymous: false,
      });

      expect(submission.shouldTriggerAlert()).toBe(true);
    });

    it('deve retornar false para nível de emoção 5', () => {
      const submission = EmociogramaSubmissionEntity.create({
        organizationId: 'org-123',
        userId: 'user-456',
        emotionLevel: 5,
        categoryId: 'cat-789',
        isAnonymous: false,
      });

      expect(submission.shouldTriggerAlert()).toBe(false);
    });
  });

  describe('maskIdentity', () => {
    it('deve mascarar ID do usuário para submissão anônima', () => {
      const submission = EmociogramaSubmissionEntity.create({
        organizationId: 'org-123',
        userId: 'user-456',
        emotionLevel: 7,
        categoryId: 'cat-789',
        isAnonymous: true,
        department: 'Engenharia',
        team: 'Backend',
      });

      const masked = submission.maskIdentity();

      expect(masked.userId).toBe('anonymous');
      expect(masked.department).toBe('Engenharia');
      expect(masked.team).toBe('Backend');
    });

    it('não deve mascarar submissão não-anônima', () => {
      const submission = EmociogramaSubmissionEntity.create({
        organizationId: 'org-123',
        userId: 'user-456',
        emotionLevel: 3,
        categoryId: 'cat-789',
        isAnonymous: false,
      });

      const masked = submission.maskIdentity();

      expect(masked.userId).toBe('user-456');
    });
  });
});
```

**Critérios de Aceite:**
- ✅ Todos os testes de entidade passam
- ✅ Cobertura ≥80% para entidades
- ✅ Casos extremos testados

---

### Tarefa 3.11: Testes Unitários - Casos de Uso

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 4 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivos de teste para casos de uso
- [ ] Mockar todos os repositórios e serviços
- [ ] Testar `SubmitEmociogramaUseCase`:
  - [ ] Submissão bem-sucedida
  - [ ] Emociograma desabilitado lança erro
  - [ ] Moderação de comentário chamada
  - [ ] Alerta disparado para emoção alta
  - [ ] Submissão anônima mascarada
- [ ] Testar `GetAggregatedReportUseCase`:
  - [ ] Retorna estatísticas corretas
  - [ ] Direção da tendência calculada
  - [ ] Contagens de alerta precisas

**Critérios de Aceite:**
- ✅ Todos os testes de caso de uso passam
- ✅ Cobertura ≥80%
- ✅ Mocks configurados corretamente

---

### Tarefa 3.12: Testes de Integração - Repositório

**Prioridade:** 🟢 Média
**Tempo Estimado:** 4 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `submission.repository.integration.spec.ts`
- [ ] Configurar banco de dados de teste com dados de seed
- [ ] Testar `getAggregatedByTimeRange()` com dados reais
- [ ] Testar `findSubmissionsAboveThreshold()`
- [ ] Testar `getMostMotivated()` e `getLeastMotivated()`
- [ ] Verificar se índices estão sendo usados (EXPLAIN ANALYZE)
- [ ] Limpar dados de teste

**Critérios de Aceite:**
- ✅ Testes de integração passam
- ✅ Agregações retornam dados corretos
- ✅ Índices verificados

---

## Definição de Pronto

O Marco 3 está completo quando:

- ✅ **Banco de Dados:** Tabelas do Emociograma criadas com categorias inseridas
- ✅ **Entidades:** Entidades Category e Submission com lógica de negócio
- ✅ **Repositório:** Implementação completa com consultas de agregação
- ✅ **Casos de Uso:** Casos de uso Submit e Get Report funcionais
- ✅ **Serviços:** Serviço de moderação de comentários operacional
- ✅ **Testes:** Cobertura ≥80% (unitário + integração)
- ✅ **Validação:** Nível de emoção validado, alertas disparados corretamente

---

## Dependências para Próximos Marcos

- **Marco 4 (Sistema de Alertas):** Requer `shouldTriggerAlert()` e entidade de submissão
- **Marco 5 (Endpoints da API):** Requer casos de uso funcionais

---

## Recursos

- [Agregações do TypeORM](https://typeorm.io/select-query-builder#using-subqueries)
- [Providers Customizados do NestJS](https://docs.nestjs.com/fundamentals/custom-providers)
- [Dicas de Performance do PostgreSQL](https://www.postgresql.org/docs/current/performance-tips.html)
