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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
  ApiQuery,
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
} from '../../application/dtos';
import type { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import type { MaskedSubmissionData } from '../../domain/entities/submission.entity';

/**
 * Controller do Emociograma
 *
 * Gerencia todas as operações relacionadas ao emociograma:
 * - Submissão de estado emocional
 * - Consulta de histórico pessoal
 * - Relatórios agregados para gestores
 * - Analytics avançados para admins
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
    private readonly getTeamSubmissionsUseCase: GetTeamSubmissionsUseCase,
    private readonly getAggregatedReportUseCase: GetAggregatedReportUseCase,
    private readonly getAnalyticsUseCase: GetAnalyticsUseCase,
  ) {}

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
  // TEAM REPORT ENDPOINTS
  // ===========================

  /**
   * Obter relatório agregado da equipe
   */
  @Get('team/aggregated')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter relatório agregado da equipe',
    description:
      'Gestores podem visualizar dados emocionais agregados de sua equipe (sem identidades individuais).',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'department', required: false, type: String })
  @ApiQuery({ name: 'team', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Relatório recuperado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão - requer GESTOR ou ADMIN' })
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
   */
  @Get('team/anonymized')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter submissões anonimizadas da equipe',
    description:
      'Visualizar lista de submissões com IDs de usuário mascarados. Preserva departamento/equipe para contexto.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Submissões recuperadas' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão - requer GESTOR ou ADMIN' })
  async getTeamAnonymized(
    @Headers('x-organization-id') organizationId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<MaskedSubmissionData[]>> {
    this.validateOrganizationId(organizationId);

    const result = (await this.getTeamSubmissionsUseCase.execute(
      organizationId,
      userId,
      pagination,
      true, // anonymize = true
    )) as AnonymizedPaginatedResult;

    return ApiResponseDto.paginated(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  // ===========================
  // ORGANIZATION REPORT ENDPOINTS
  // ===========================

  /**
   * Obter relatório completo da organização
   */
  @Get('organization/report')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Obter relatório da organização',
    description:
      'Admins podem visualizar dados emocionais completos da organização com estatísticas detalhadas.',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'department', required: false, type: String })
  @ApiQuery({ name: 'team', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Relatório recuperado' })
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
   * Obter analytics avançados da organização
   */
  @Get('organization/analytics')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Obter analytics da organização',
    description:
      'Analytics avançados: colaboradores mais/menos motivados, tendências, padrões temporais.',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'includeDepartments', required: false, type: Boolean })
  @ApiQuery({ name: 'includeTeams', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Analytics recuperados' })
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
  // HELPER METHODS
  // ===========================

  /**
   * Valida que o organizationId foi fornecido
   */
  private validateOrganizationId(organizationId: string): void {
    if (!organizationId) {
      throw new BadRequestException('Header x-organization-id é obrigatório');
    }
  }
}
