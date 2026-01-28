import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../../auth/presentation/guards/supabase-auth.guard';
import { RolesGuard } from '../../../../core/presentation/guards/roles.guard';
import { Roles } from '../../../../core/presentation/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/presentation/decorators/current-user.decorator';
import type { UserPayload } from '../../../../core/presentation/decorators/current-user.decorator';
import { Role } from '../../../roles/domain/enums/role.enum';
import {
  PaginationDto,
  ApiResponseDto,
} from '../../../../core/application/dtos';
import {
  SubmitEmociogramaUseCase,
  GetMySubmissionsUseCase,
  GetSubmissionByIdUseCase,
  ExportEmociogramaUseCase,
  GetTeamSubmissionsUseCase,
  GetAggregatedReportUseCase,
  GetAnalyticsUseCase,
} from '../../application/use-cases';
import type { AggregatedReportResponse } from '../../application/use-cases/get-aggregated-report.use-case';
import type { AnalyticsResponse } from '../../application/use-cases/get-analytics.use-case';
import type { AnonymizedPaginatedResult } from '../../application/use-cases/get-team-submissions.use-case';
import {
  SubmitEmociogramaDto,
  AggregatedReportDto,
  AnalyticsQueryDto,
  SubmissionResponseDto,
  ExportQueryDto,
} from '../../application/dtos';
import type { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import type { MaskedSubmissionData } from '../../domain/entities/submission.entity';

/**
 * Controller do Emociograma
 *
 * Gerencia as operações de submissão e exportação de estado emocional dos colaboradores.
 * Todos os endpoints requerem autenticação e contexto de organização.
 *
 * Endpoints:
 * - POST /emociograma - Enviar estado emocional
 * - GET /emociograma/my-submissions - Obter histórico próprio
 * - GET /emociograma/submission/:id - Obter submissão específica
 * - GET /emociograma/team/aggregated - Relatório agregado da equipe (GESTOR, ADMIN)
 * - GET /emociograma/team/anonymized - Submissões anonimizadas (GESTOR, ADMIN)
 * - GET /emociograma/organization/report - Relatório da organização (ADMIN)
 * - GET /emociograma/organization/analytics - Analytics avançado (ADMIN)
 * - GET /emociograma/export - Exportar dados (GESTOR, ADMIN)
 */
@ApiTags('Emociograma')
@Controller('emociograma')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-organization-id',
  description: 'ID da organização do usuário',
  required: true,
})
export class EmociogramaController {
  constructor(
    private readonly submitUseCase: SubmitEmociogramaUseCase,
    private readonly getMySubmissionsUseCase: GetMySubmissionsUseCase,
    private readonly getSubmissionByIdUseCase: GetSubmissionByIdUseCase,
    private readonly exportUseCase: ExportEmociogramaUseCase,
    private readonly getTeamSubmissionsUseCase: GetTeamSubmissionsUseCase,
    private readonly getAggregatedReportUseCase: GetAggregatedReportUseCase,
    private readonly getAnalyticsUseCase: GetAnalyticsUseCase,
  ) {}

  /**
   * Valida se o organizationId foi fornecido
   */
  private validateOrganizationId(organizationId: string): void {
    if (!organizationId) {
      throw new BadRequestException('Header x-organization-id é obrigatório');
    }
  }

  // ===========================
  // SUBMISSION ENDPOINTS
  // ===========================

  /**
   * Enviar estado emocional diário
   */
  @Post()
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Enviar estado emocional diário',
    description:
      'Colaboradores enviam seu estado emocional diário com anonimato opcional. ' +
      'Dispara alertas automaticamente se nível de emoção >= 6.',
  })
  @ApiResponse({
    status: 201,
    description: 'Submissão criada com sucesso',
    type: SubmissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Emociograma desabilitado' })
  async submit(
    @Body() dto: SubmitEmociogramaDto,
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<
    ApiResponseDto<EmociogramaSubmissionEntity | MaskedSubmissionData>
  > {
    this.validateOrganizationId(organizationId);

    const submission = await this.submitUseCase.execute(
      dto,
      userId,
      organizationId,
    );

    return ApiResponseDto.ok(submission);
  }

  /**
   * Obter histórico de submissões do próprio usuário
   */
  @Get('my-submissions')
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter meu histórico de submissões',
    description: 'Recupera lista paginada de submissões emocionais próprias.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Submissões recuperadas' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getMySubmissions(
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
    @Query() pagination: PaginationDto,
  ): Promise<ApiResponseDto<EmociogramaSubmissionEntity[]>> {
    this.validateOrganizationId(organizationId);

    const result = await this.getMySubmissionsUseCase.execute(
      userId,
      organizationId,
      pagination,
    );

    return ApiResponseDto.paginated(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  /**
   * Obter submissão específica por ID
   */
  @Get('submission/:id')
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter submissão específica por ID',
    description:
      'Colaboradores só podem ver suas próprias. Gestores/admins veem todas (mascaradas se anônimas).',
  })
  @ApiParam({ name: 'id', description: 'ID da submissão (UUID)' })
  @ApiResponse({ status: 200, description: 'Submissão recuperada' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Não encontrada' })
  async getSubmissionById(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<
    ApiResponseDto<EmociogramaSubmissionEntity | MaskedSubmissionData>
  > {
    this.validateOrganizationId(organizationId);

    const submission = await this.getSubmissionByIdUseCase.execute(
      id,
      user.id,
      organizationId,
      user.role as Role | undefined,
    );

    return ApiResponseDto.ok(submission);
  }

  // ===========================
  // REPORT ENDPOINTS
  // ===========================

  /**
   * Obter relatório agregado da equipe
   *
   * Gera estatísticas agregadas incluindo totais, médias, tendências e distribuições.
   */
  @Get('team/aggregated')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter relatório agregado da equipe',
    description:
      'Gera estatísticas agregadas das submissões da equipe incluindo ' +
      'totais, médias, tendências e distribuição por categoria.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Data de início do período (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'Data de fim do período (ISO 8601)',
  })
  @ApiQuery({ name: 'department', required: false, type: String })
  @ApiQuery({ name: 'team', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Relatório agregado retornado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão - requer GESTOR ou ADMIN',
  })
  async getTeamAggregated(
    @Headers('x-organization-id') organizationId: string,
    @Query() query: AggregatedReportDto,
  ): Promise<ApiResponseDto<AggregatedReportResponse>> {
    this.validateOrganizationId(organizationId);

    const report = await this.getAggregatedReportUseCase.execute(
      query,
      organizationId,
    );

    return ApiResponseDto.ok(report);
  }

  /**
   * Obter submissões anonimizadas da equipe
   *
   * Retorna lista paginada de submissões com dados pessoais mascarados.
   */
  @Get('team/anonymized')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter submissões anonimizadas da equipe',
    description:
      'Retorna lista paginada de submissões da equipe com dados ' +
      'pessoais mascarados para preservar privacidade.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Submissões anonimizadas retornadas' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão - requer GESTOR ou ADMIN',
  })
  async getTeamAnonymized(
    @Headers('x-organization-id') organizationId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<AnonymizedPaginatedResult>> {
    this.validateOrganizationId(organizationId);

    const result = await this.getTeamSubmissionsUseCase.execute(
      organizationId,
      userId,
      pagination,
      true, // anonymize
    );

    return ApiResponseDto.ok(result as AnonymizedPaginatedResult);
  }

  /**
   * Obter relatório completo da organização
   *
   * Disponível apenas para ADMIN. Retorna estatísticas de toda a organização.
   */
  @Get('organization/report')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Obter relatório da organização',
    description:
      'Gera relatório completo com estatísticas de toda a organização. ' +
      'Disponível apenas para administradores.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Data de início do período (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'Data de fim do período (ISO 8601)',
  })
  @ApiQuery({ name: 'department', required: false, type: String })
  @ApiQuery({ name: 'team', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Relatório da organização retornado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão - requer ADMIN' })
  async getOrganizationReport(
    @Headers('x-organization-id') organizationId: string,
    @Query() query: AggregatedReportDto,
  ): Promise<ApiResponseDto<AggregatedReportResponse>> {
    this.validateOrganizationId(organizationId);

    const report = await this.getAggregatedReportUseCase.execute(
      query,
      organizationId,
    );

    return ApiResponseDto.ok(report);
  }

  /**
   * Obter analytics avançado da organização
   *
   * Disponível apenas para ADMIN. Retorna analytics com padrões e insights.
   */
  @Get('organization/analytics')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Obter analytics da organização',
    description:
      'Gera analytics avançado incluindo colaboradores mais/menos motivados, ' +
      'padrões temporais e análises por período. Disponível apenas para administradores.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Data de início do período (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'Data de fim do período (ISO 8601)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limite de resultados para listas (padrão: 10)',
  })
  @ApiResponse({ status: 200, description: 'Analytics retornado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão - requer ADMIN' })
  async getOrganizationAnalytics(
    @Headers('x-organization-id') organizationId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<ApiResponseDto<AnalyticsResponse>> {
    this.validateOrganizationId(organizationId);

    const analytics = await this.getAnalyticsUseCase.execute(
      organizationId,
      query,
    );

    return ApiResponseDto.ok(analytics);
  }

  // ===========================
  // EXPORT ENDPOINT
  // ===========================

  /**
   * Exportar dados do emociograma
   *
   * Permite exportar submissões de emociograma em diferentes formatos.
   * - GESTOR: Exporta dados da equipe (anonimizados)
   * - ADMIN: Exporta todos os dados da organização
   *
   * Formatos suportados: CSV, Excel, JSON
   */
  @Get('export')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Exportar dados do emociograma',
    description:
      'Exportar submissões para formato CSV, Excel ou JSON. ' +
      'Gestores exportam dados da equipe (anonimizados), Admins exportam todos os dados.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Data de início do período (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'Data de fim do período (ISO 8601)',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'excel', 'json'],
    description: 'Formato de exportação (padrão: csv)',
  })
  @ApiQuery({
    name: 'department',
    required: false,
    type: String,
    description: 'Filtrar por departamento',
  })
  @ApiQuery({
    name: 'team',
    required: false,
    type: String,
    description: 'Filtrar por equipe',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filtrar por categoria de emoção',
  })
  @ApiProduces('text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json')
  @ApiResponse({
    status: 200,
    description: 'Arquivo exportado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros inválidos ou organização não especificada',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão - requer GESTOR ou ADMIN',
  })
  async exportData(
    @Headers('x-organization-id') organizationId: string,
    @Query() query: ExportQueryDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Res() response: Response,
  ): Promise<void> {
    if (!organizationId) {
      throw new BadRequestException('Header x-organization-id é obrigatório');
    }

    const result = await this.exportUseCase.execute(
      organizationId,
      query,
      userId,
      userRole,
    );

    response.setHeader('Content-Type', result.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    response.send(result.data);
  }
}
