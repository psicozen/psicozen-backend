# Marco 5: Endpoints da API & Controllers

**Cronograma:** Semana 4
**Dependências:** Marco 3 (Emociograma Core), Marco 4 (Sistema de Alertas)
**Status:** 🔴 Não Iniciado

---

## Visão Geral

Construir endpoints da API REST para todos os recursos do Emociograma: submissão, recuperação, relatórios, alertas e exportação. Implementar controllers com autenticação, autorização, validação e documentação Swagger apropriadas.

**Entregável Principal:** API REST completa para sistema Emociograma acessível via HTTP.

---

## Detalhamento de Tarefas

### Tarefa 5.1: DTOs - Objetos de Request/Response

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar diretório: `src/modules/emociograma/application/dtos/`
- [ ] Criar DTOs:
  - [ ] `submit-emociograma.dto.ts` (já criado no M3)
  - [ ] `aggregated-report.dto.ts` (já criado no M3)
  - [ ] `export-query.dto.ts`
  - [ ] `resolve-alert.dto.ts`
  - [ ] DTOs de Response para respostas da API
- [ ] Adicionar decoradores de validação: `@IsInt()`, `@Min()`, `@Max()`, `@IsUUID()`, etc.
- [ ] Adicionar decoradores do Swagger: `@ApiProperty()`, `@ApiPropertyOptional()`

**DTO de Export Query:**
```typescript
import { IsDate, IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
}

export class ExportQueryDto {
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

  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;
}
```

**DTO de Resolve Alert:**
```typescript
import { IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveAlertDto {
  @ApiPropertyOptional({ description: 'Notas de resolução', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
```

**DTOs de Response:**
```typescript
// Envolver entidade em resposta padrão da API
export class SubmissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  emotionLevel: number;

  @ApiProperty()
  emotionEmoji: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  isAnonymous: boolean;

  @ApiPropertyOptional()
  comment?: string;

  @ApiProperty()
  submittedAt: Date;

  @ApiPropertyOptional()
  department?: string;

  @ApiPropertyOptional()
  team?: string;
}
```

**Critérios de Aceite:**
- ✅ Todos os DTOs criados
- ✅ Decoradores de validação aplicados
- ✅ Anotações Swagger completas
- ✅ Tipos TypeScript correspondem às entidades

---

### Tarefa 5.2: Controller do Emociograma - Endpoints de Submissão

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 4 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/presentation/controllers/emociograma.controller.ts`
- [ ] Adicionar decorator `@Controller('emociograma')`
- [ ] Aplicar `@UseGuards(JwtAuthGuard, RolesGuard)`
- [ ] Adicionar `@ApiTags('Emociograma')` para Swagger
- [ ] Implementar endpoints:
  - [ ] `POST /emociograma` - Enviar emoção (COLABORADOR)
  - [ ] `GET /emociograma/my-submissions` - Obter próprio histórico (COLABORADOR)
  - [ ] `GET /emociograma/submission/:id` - Obter submissão específica (COLABORADOR, GESTOR, ADMIN)
- [ ] Adicionar descrições de operação do Swagger
- [ ] Envolver respostas em `ApiResponseDto`

**Código do Controller:**
```typescript
import { Controller, Get, Post, Param, Body, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/presentation/guards/roles.guard';
import { Roles } from '@/core/presentation/decorators/roles.decorator';
import { CurrentUser } from '@/core/presentation/decorators/current-user.decorator';
import { Role } from '@/modules/roles/domain/enums/role.enum';
import { ApiResponseDto } from '@/core/application/dtos/api-response.dto';
import { PaginationDto, PaginatedResult } from '@/core/application/dtos/pagination.dto';
import { SubmitEmociogramaUseCase } from '../../application/use-cases/submit-emociograma.use-case';
import { GetMySubmissionsUseCase } from '../../application/use-cases/get-my-submissions.use-case';
import { SubmitEmociogramaDto } from '../../application/dtos/submit-emociograma.dto';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';

@Controller('emociograma')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Emociograma')
@ApiBearerAuth()
export class EmociogramaController {
  constructor(
    private readonly submitUseCase: SubmitEmociogramaUseCase,
    private readonly getMySubmissionsUseCase: GetMySubmissionsUseCase,
  ) {}

  @Post()
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Enviar estado emocional diário',
    description: 'Funcionários enviam seu estado emocional diário com anonimato opcional. Dispara alertas se nível de emoção >= 6.',
  })
  @ApiResponse({ status: 201, description: 'Submissão criada com sucesso' })
  @ApiResponse({ status: 403, description: 'Emociograma desabilitado para organização' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async submit(
    @Body() dto: SubmitEmociogramaDto,
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<EmociogramaSubmissionEntity>> {
    const submission = await this.submitUseCase.execute(dto, userId, organizationId);
    return ApiResponseDto.success(submission, 'Submissão criada com sucesso');
  }

  @Get('my-submissions')
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter meu histórico de submissões',
    description: 'Recuperar lista paginada de submissões emocionais próprias.',
  })
  @ApiResponse({ status: 200, description: 'Submissões recuperadas com sucesso' })
  async getMySubmissions(
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
    @Query() query: PaginationDto,
  ): Promise<ApiResponseDto<PaginatedResult<EmociogramaSubmissionEntity>>> {
    const result = await this.getMySubmissionsUseCase.execute(userId, organizationId, query);
    return ApiResponseDto.success(result);
  }

  @Get('submission/:id')
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Obter submissão específica por ID' })
  @ApiParam({ name: 'id', description: 'ID da Submissão' })
  @ApiResponse({ status: 200, description: 'Submissão recuperada' })
  @ApiResponse({ status: 404, description: 'Submissão não encontrada' })
  async getSubmissionById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<EmociogramaSubmissionEntity>> {
    const submission = await this.getSubmissionByIdUseCase.execute(id, userId);
    return ApiResponseDto.success(submission);
  }
}
```

**Critérios de Aceite:**
- ✅ Controller criado com 3 endpoints
- ✅ Guards aplicados (JWT + Roles)
- ✅ Anotações Swagger completas
- ✅ Respostas envolvidas em ApiResponseDto

---

### Tarefa 5.3: Controller do Emociograma - Endpoints de Relatórios

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 4 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Adicionar endpoints de relatório ao `EmociogramaController`:
  - [ ] `GET /emociograma/team/aggregated` - Relatório da equipe (GESTOR, ADMIN)
  - [ ] `GET /emociograma/team/anonymized` - Lista anonimizada (GESTOR, ADMIN)
  - [ ] `GET /emociograma/organization/report` - Relatório completo da org (ADMIN)
  - [ ] `GET /emociograma/organization/analytics` - Analytics (ADMIN)
- [ ] Implementar verificações de permissão
- [ ] Adicionar documentação Swagger

**Código dos Endpoints de Relatório:**
```typescript
@Get('team/aggregated')
@Roles(Role.GESTOR, Role.ADMIN)
@ApiOperation({
  summary: 'Obter relatório agregado da equipe',
  description: 'Gestores podem visualizar dados emocionais agregados de sua equipe (sem identidades individuais).',
})
@ApiResponse({ status: 200, description: 'Relatório recuperado com sucesso' })
async getTeamAggregated(
  @Headers('x-organization-id') organizationId: string,
  @Query() query: AggregatedReportDto,
  @CurrentUser('id') userId: string,
): Promise<ApiResponseDto<AggregatedReportResponse>> {
  const report = await this.getAggregatedReportUseCase.execute(query, organizationId, userId, 'team');
  return ApiResponseDto.success(report);
}

@Get('team/anonymized')
@Roles(Role.GESTOR, Role.ADMIN)
@ApiOperation({
  summary: 'Obter submissões anonimizadas da equipe',
  description: 'Visualizar lista de submissões com IDs de usuário mascarados. Preserva departamento/equipe para contexto.',
})
@ApiResponse({ status: 200, description: 'Submissões recuperadas' })
async getTeamAnonymized(
  @Headers('x-organization-id') organizationId: string,
  @Query() query: PaginationDto,
  @CurrentUser('id') userId: string,
): Promise<ApiResponseDto<PaginatedResult<EmociogramaSubmissionEntity>>> {
  const result = await this.getTeamSubmissionsUseCase.execute(organizationId, userId, query, true);
  return ApiResponseDto.success(result);
}

@Get('organization/report')
@Roles(Role.ADMIN)
@ApiOperation({
  summary: 'Obter relatório da organização',
  description: 'Admins podem visualizar dados emocionais completos da organização com submissões identificadas.',
})
@ApiResponse({ status: 200, description: 'Relatório recuperado' })
async getOrganizationReport(
  @Headers('x-organization-id') organizationId: string,
  @Query() query: AggregatedReportDto,
): Promise<ApiResponseDto<AggregatedReportResponse>> {
  const report = await this.getAggregatedReportUseCase.execute(query, organizationId, null, 'organization');
  return ApiResponseDto.success(report);
}

@Get('organization/analytics')
@Roles(Role.ADMIN)
@ApiOperation({
  summary: 'Obter analytics da organização',
  description: 'Analytics avançados: mais/menos motivados, tendências, padrões.',
})
@ApiResponse({ status: 200, description: 'Analytics recuperados' })
async getOrganizationAnalytics(
  @Headers('x-organization-id') organizationId: string,
  @Query() query: AnalyticsQueryDto,
): Promise<ApiResponseDto<AnalyticsResponse>> {
  const analytics = await this.getAnalyticsUseCase.execute(organizationId, query);
  return ApiResponseDto.success(analytics);
}
```

**Critérios de Aceite:**
- ✅ 4 endpoints de relatório implementados
- ✅ Guards de papéis apropriados (GESTOR vs ADMIN)
- ✅ Docs Swagger completas

---

### Tarefa 5.4: Controller de Export - Export CSV/Excel

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 5 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Adicionar endpoint de export ao `EmociogramaController`:
  - [ ] `GET /emociograma/export` - Exportar dados (GESTOR, ADMIN)
- [ ] Criar `ExportEmociogramaUseCase`
- [ ] Implementar geração de CSV usando biblioteca `csv-stringify`
- [ ] Implementar geração de Excel usando biblioteca `exceljs`
- [ ] Definir headers de resposta apropriados (`Content-Type`, `Content-Disposition`)
- [ ] Fazer stream de exports grandes

**Endpoint de Export:**
```typescript
import { Response } from 'express';
import { Res } from '@nestjs/common';

@Get('export')
@Roles(Role.GESTOR, Role.ADMIN)
@ApiOperation({
  summary: 'Exportar dados do emociograma',
  description: 'Exportar submissões para formato CSV ou Excel. Gestores exportam dados da equipe, Admins exportam todos.',
})
@ApiResponse({ status: 200, description: 'Arquivo baixado', type: 'string', format: 'binary' })
async exportData(
  @Headers('x-organization-id') organizationId: string,
  @Query() query: ExportQueryDto,
  @CurrentUser('id') userId: string,
  @CurrentUser('roles') userRoles: Role[],
  @Res() response: Response,
): Promise<void> {
  const format = query.format || ExportFormat.CSV;
  const data = await this.exportUseCase.execute(organizationId, query, userId, userRoles);

  if (format === ExportFormat.CSV) {
    response.setHeader('Content-Type', 'text/csv');
    response.setHeader('Content-Disposition', 'attachment; filename=emociograma.csv');
    response.send(data);
  } else if (format === ExportFormat.EXCEL) {
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', 'attachment; filename=emociograma.xlsx');
    response.send(data);
  } else {
    response.setHeader('Content-Type', 'application/json');
    response.send(data);
  }
}
```

**Caso de Uso de Export:**
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import * as ExcelJS from 'exceljs';
import { IEmociogramaSubmissionRepository, EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import { Role } from '@/modules/roles/domain/enums/role.enum';

@Injectable()
export class ExportEmociogramaUseCase {
  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
  ) {}

  async execute(
    organizationId: string,
    query: ExportQueryDto,
    userId: string,
    userRoles: Role[],
  ): Promise<Buffer | string> {
    // Obter submissões com base no papel do usuário
    const isGestor = userRoles.includes(Role.GESTOR) && !userRoles.includes(Role.ADMIN);
    const submissions = isGestor
      ? await this.submissionRepository.getByTeam(organizationId, userTeam, {
          startDate: query.startDate,
          endDate: query.endDate,
        })
      : await this.submissionRepository.getAggregatedByTimeRange(
          organizationId,
          query.startDate,
          query.endDate,
          { department: query.department, team: query.team, categoryId: query.categoryId },
        );

    // Formatar dados
    const records = submissions.data.map(sub => ({
      Data: sub.submittedAt.toISOString(),
      'Nível Emocional': sub.emotionLevel,
      Emoji: sub.emotionEmoji,
      Categoria: sub.categoryId,
      Departamento: sub.department || 'N/A',
      Equipe: sub.team || 'N/A',
      Anônimo: sub.isAnonymous ? 'Sim' : 'Não',
      Comentário: sub.comment || '',
    }));

    // Gerar export
    if (query.format === ExportFormat.CSV) {
      return stringify(records, { header: true });
    } else if (query.format === ExportFormat.EXCEL) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Emociograma');

      worksheet.columns = [
        { header: 'Data', key: 'Data', width: 20 },
        { header: 'Nível Emocional', key: 'Nível Emocional', width: 15 },
        { header: 'Emoji', key: 'Emoji', width: 10 },
        { header: 'Categoria', key: 'Categoria', width: 20 },
        { header: 'Departamento', key: 'Departamento', width: 20 },
        { header: 'Equipe', key: 'Equipe', width: 20 },
        { header: 'Anônimo', key: 'Anônimo', width: 10 },
        { header: 'Comentário', key: 'Comentário', width: 40 },
      ];

      worksheet.addRows(records);

      return workbook.xlsx.writeBuffer();
    } else {
      return JSON.stringify(records, null, 2);
    }
  }
}
```

**Dependências:**
```bash
npm install csv-stringify exceljs
npm install --save-dev @types/csv-stringify
```

**Critérios de Aceite:**
- ✅ Endpoint de export implementado
- ✅ Geração de CSV funciona
- ✅ Geração de Excel funciona
- ✅ Headers de resposta apropriados definidos
- ✅ Gestores exportam apenas dados da equipe, Admins exportam todos

---

### Tarefa 5.5: Controller de Alertas

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/presentation/controllers/alerts.controller.ts`
- [ ] Implementar endpoints:
  - [ ] `GET /alerts` - Listar alertas (GESTOR, ADMIN)
  - [ ] `GET /alerts/dashboard` - Resumo do dashboard (GESTOR, ADMIN)
  - [ ] `PATCH /alerts/:id/resolve` - Resolver alerta (GESTOR, ADMIN)
  - [ ] `GET /alerts/:id` - Obter alerta específico (GESTOR, ADMIN)
- [ ] Adicionar documentação Swagger

**Código do Controller de Alertas:**
```typescript
import { Controller, Get, Patch, Param, Body, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/presentation/guards/roles.guard';
import { Roles } from '@/core/presentation/decorators/roles.decorator';
import { CurrentUser } from '@/core/presentation/decorators/current-user.decorator';
import { Role } from '@/modules/roles/domain/enums/role.enum';
import { ApiResponseDto } from '@/core/application/dtos/api-response.dto';
import { GetAlertDashboardUseCase } from '../../application/use-cases/get-alert-dashboard.use-case';
import { ResolveAlertUseCase } from '../../application/use-cases/resolve-alert.use-case';
import { ResolveAlertDto } from '../../application/dtos/resolve-alert.dto';

@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Alerts')
@ApiBearerAuth()
export class AlertsController {
  constructor(
    private readonly getDashboardUseCase: GetAlertDashboardUseCase,
    private readonly resolveAlertUseCase: ResolveAlertUseCase,
  ) {}

  @Get('dashboard')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Obter resumo do dashboard de alertas' })
  @ApiResponse({ status: 200, description: 'Dashboard recuperado' })
  async getDashboard(
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<AlertDashboardResponse>> {
    const dashboard = await this.getDashboardUseCase.execute(organizationId);
    return ApiResponseDto.success(dashboard);
  }

  @Patch(':id/resolve')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Marcar alerta como resolvido' })
  @ApiResponse({ status: 200, description: 'Alerta resolvido' })
  async resolveAlert(
    @Param('id') id: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<EmociogramaAlertEntity>> {
    const alert = await this.resolveAlertUseCase.execute(id, userId, dto.notes);
    return ApiResponseDto.success(alert, 'Alerta resolvido com sucesso');
  }
}
```

**Critérios de Aceite:**
- ✅ Controller de alertas criado
- ✅ Endpoint de dashboard implementado
- ✅ Endpoint de resolução implementado
- ✅ Docs Swagger completas

---

### Tarefa 5.6: Controller de Categorias

**Prioridade:** 🟢 Média
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/presentation/controllers/categories.controller.ts`
- [ ] Implementar endpoints:
  - [ ] `GET /categories` - Listar todas as categorias (PÚBLICO)
  - [ ] `POST /categories` - Criar categoria (ADMIN)
  - [ ] `PATCH /categories/:id` - Atualizar categoria (ADMIN)
  - [ ] `DELETE /categories/:id` - Desativar categoria (ADMIN)

**Controller de Categorias:**
```typescript
@Controller('emociograma/categories')
@ApiTags('Emociograma - Categorias')
export class CategoriesController {
  constructor(
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar todas as categorias ativas do emociograma' })
  @ApiResponse({ status: 200, description: 'Categorias recuperadas' })
  async listCategories(): Promise<ApiResponseDto<EmociogramaCategoryEntity[]>> {
    const categories = await this.listCategoriesUseCase.execute();
    return ApiResponseDto.success(categories);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar nova categoria (Apenas Admin)' })
  @ApiResponse({ status: 201, description: 'Categoria criada' })
  async createCategory(@Body() dto: CreateCategoryDto): Promise<ApiResponseDto<EmociogramaCategoryEntity>> {
    const category = await this.createCategoryUseCase.execute(dto);
    return ApiResponseDto.success(category);
  }
}
```

**Critérios de Aceite:**
- ✅ Controller de categorias criado
- ✅ Endpoint de listagem público (sem auth)
- ✅ Create/Update/Delete protegidos (Apenas ADMIN)

---

### Tarefa 5.7: Testes E2E - Endpoints da API

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 6 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo de teste: `test/emociograma.e2e-spec.ts`
- [ ] Configurar banco de dados de teste e autenticação
- [ ] Criar usuários de teste com diferentes papéis
- [ ] Testar fluxo de submissão:
  - [ ] Colaborador envia emoção
  - [ ] Submissão anônima mascara ID do usuário
  - [ ] Alerta disparado para emoção alta
- [ ] Testar endpoints de relatório:
  - [ ] Gestor pode visualizar dados da equipe
  - [ ] Admin pode visualizar dados da org
  - [ ] Colaborador não pode acessar relatórios (403)
- [ ] Testar export:
  - [ ] Download de CSV funciona
  - [ ] Headers apropriados definidos
- [ ] Testar alertas:
  - [ ] Dashboard carrega
  - [ ] Resolução funciona

**Exemplo de Teste E2E:**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Emociograma (E2E)', () => {
  let app: INestApplication;
  let colaboradorToken: string;
  let gestorToken: string;
  let adminToken: string;
  let testOrgId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup: Criar organização e usuários de teste
    // ... (setup de autenticação)
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /emociograma', () => {
    it('deve enviar emoção como Colaborador', async () => {
      const response = await request(app.getHttpServer())
        .post('/emociograma')
        .set('Authorization', `Bearer ${colaboradorToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          emotionLevel: 8,
          categoryId: testCategoryId,
          isAnonymous: true,
          comment: 'Sentindo-me estressado hoje',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isAnonymous).toBe(true);
      expect(response.body.data.userId).toBe('anonymous');
    });

    it('deve rejeitar nível de emoção inválido', async () => {
      await request(app.getHttpServer())
        .post('/emociograma')
        .set('Authorization', `Bearer ${colaboradorToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          emotionLevel: 11, // Inválido
          categoryId: testCategoryId,
          isAnonymous: false,
        })
        .expect(400);
    });
  });

  describe('GET /emociograma/team/aggregated', () => {
    it('deve retornar dados agregados para Gestor', async () => {
      const response = await request(app.getHttpServer())
        .get('/emociograma/team/aggregated')
        .set('Authorization', `Bearer ${gestorToken}`)
        .set('x-organization-id', testOrgId)
        .query({
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-31T23:59:59Z',
        })
        .expect(200);

      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
    });

    it('deve negar acesso para Colaborador', async () => {
      await request(app.getHttpServer())
        .get('/emociograma/team/aggregated')
        .set('Authorization', `Bearer ${colaboradorToken}`)
        .set('x-organization-id', testOrgId)
        .query({
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-31T23:59:59Z',
        })
        .expect(403);
    });
  });

  describe('GET /emociograma/export', () => {
    it('deve exportar CSV para Admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/emociograma/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrgId)
        .query({
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-31T23:59:59Z',
          format: 'csv',
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Data,Nível Emocional');
    });
  });

  describe('PATCH /alerts/:id/resolve', () => {
    it('deve resolver alerta como Gestor', async () => {
      // Primeiro, criar alerta enviando emoção alta
      const submissionResponse = await request(app.getHttpServer())
        .post('/emociograma')
        .set('Authorization', `Bearer ${colaboradorToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          emotionLevel: 9,
          categoryId: testCategoryId,
          isAnonymous: false,
        });

      // Obter alertas
      const alertsResponse = await request(app.getHttpServer())
        .get('/alerts/dashboard')
        .set('Authorization', `Bearer ${gestorToken}`)
        .set('x-organization-id', testOrgId);

      const alertId = alertsResponse.body.data.recentAlerts[0].id;

      // Resolver alerta
      const response = await request(app.getHttpServer())
        .patch(`/alerts/${alertId}/resolve`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          notes: 'Conversei com o funcionário, situação melhorou',
        })
        .expect(200);

      expect(response.body.data.isResolved).toBe(true);
      expect(response.body.data.resolutionNotes).toBeDefined();
    });
  });
});
```

**Critérios de Aceite:**
- ✅ Todos os testes E2E passam
- ✅ Autorização testada (403 para papéis não autorizados)
- ✅ Fluxos completos testados (enviar → alerta → resolver)
- ✅ Export testado

---

## Definição de Pronto

O Marco 5 está completo quando:

- ✅ **DTOs:** Todos os DTOs de request/response criados com validação
- ✅ **Controllers:** Controllers Emociograma, Alertas, Categorias implementados
- ✅ **Swagger:** Documentação completa da API
- ✅ **Export:** Export CSV/Excel funcional
- ✅ **Autorização:** Controle de acesso baseado em papéis aplicado
- ✅ **Testes:** Testes E2E passam para todos os endpoints
- ✅ **Validação:** Validação de entrada funcionando

---

## Resumo dos Endpoints da API

| Método | Endpoint | Papéis | Descrição |
|--------|----------|--------|-----------|
| POST | `/emociograma` | Colaborador, Gestor, Admin | Enviar emoção |
| GET | `/emociograma/my-submissions` | Colaborador | Obter próprio histórico |
| GET | `/emociograma/team/aggregated` | Gestor, Admin | Relatório da equipe |
| GET | `/emociograma/organization/report` | Admin | Relatório da org |
| GET | `/emociograma/export` | Gestor, Admin | Exportar dados |
| GET | `/alerts/dashboard` | Gestor, Admin | Dashboard de alertas |
| PATCH | `/alerts/:id/resolve` | Gestor, Admin | Resolver alerta |
| GET | `/emociograma/categories` | Público | Listar categorias |

---

## Recursos

- [Controllers do NestJS](https://docs.nestjs.com/controllers)
- [Swagger/OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [Export CSV](https://csv.js.org/)
- [ExcelJS](https://github.com/exceljs/exceljs)
