import {
  Controller,
  Get,
  Patch,
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
import { Role } from '../../../roles/domain/enums/role.enum';
import { ApiResponseDto } from '../../../../core/application/dtos';
import {
  GetAlertDashboardUseCase,
  ResolveAlertUseCase,
  ListAlertsUseCase,
  GetAlertByIdUseCase,
} from '../../application/use-cases';
import type { AlertDashboardResponse } from '../../application/use-cases/get-alert-dashboard.use-case';
import type { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';
import {
  ResolveAlertDto,
  AlertsQueryDto,
  AlertResponseDto,
  AlertDashboardResponseDto,
} from '../../application/dtos';

/**
 * Controller de Alertas do Emociograma
 *
 * Gerencia as operações de alertas emocionais gerados quando
 * colaboradores reportam níveis preocupantes de bem-estar.
 *
 * Todos os endpoints requerem autenticação e role GESTOR ou ADMIN.
 *
 * Endpoints:
 * - GET /alerts - Listar alertas paginados
 * - GET /alerts/dashboard - Resumo do dashboard
 * - GET /alerts/:id - Obter alerta específico
 * - PATCH /alerts/:id/resolve - Resolver alerta
 */
@ApiTags('Alerts')
@Controller('alerts')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-organization-id',
  description: 'ID da organização do usuário',
  required: true,
})
export class AlertsController {
  constructor(
    private readonly getDashboardUseCase: GetAlertDashboardUseCase,
    private readonly resolveAlertUseCase: ResolveAlertUseCase,
    private readonly listAlertsUseCase: ListAlertsUseCase,
    private readonly getAlertByIdUseCase: GetAlertByIdUseCase,
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
  // DASHBOARD ENDPOINT
  // ===========================

  /**
   * Obter resumo do dashboard de alertas
   *
   * Retorna estatísticas consolidadas de alertas da organização
   * incluindo contagens por severidade e alertas recentes.
   */
  @Get('dashboard')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter resumo do dashboard de alertas',
    description:
      'Retorna estatísticas consolidadas de alertas da organização ' +
      'incluindo total, pendentes, resolvidos, distribuição por severidade ' +
      'e os 10 alertas não resolvidos mais recentes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard recuperado com sucesso',
    type: AlertDashboardResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Organização não especificada' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão - requer GESTOR ou ADMIN',
  })
  async getDashboard(
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<AlertDashboardResponse>> {
    this.validateOrganizationId(organizationId);

    const dashboard = await this.getDashboardUseCase.execute(organizationId);

    return ApiResponseDto.ok(dashboard);
  }

  // ===========================
  // LIST ENDPOINT
  // ===========================

  /**
   * Listar alertas da organização
   *
   * Retorna lista paginada de alertas com suporte a filtros
   * por severidade e status de resolução.
   */
  @Get()
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Listar alertas da organização',
    description:
      'Retorna lista paginada de alertas com filtros opcionais ' +
      'por severidade e inclusão de alertas resolvidos. ' +
      'Ordenação: severidade (críticos primeiro), data (recentes primeiro).',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página (1-indexed)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (máx: 100)',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
    description: 'Filtrar por severidade',
  })
  @ApiQuery({
    name: 'includeResolved',
    required: false,
    type: Boolean,
    description: 'Incluir alertas resolvidos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de alertas retornada',
    type: [AlertResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão - requer GESTOR ou ADMIN',
  })
  async listAlerts(
    @Headers('x-organization-id') organizationId: string,
    @Query() query: AlertsQueryDto,
  ): Promise<ApiResponseDto<EmociogramaAlertEntity[]>> {
    this.validateOrganizationId(organizationId);

    const result = await this.listAlertsUseCase.execute(organizationId, {
      page: query.page,
      limit: query.limit,
      severity: query.severity,
      includeResolved: query.includeResolved,
    });

    return ApiResponseDto.paginated(
      result.data,
      result.total,
      query.page || 1,
      query.limit || 20,
    );
  }

  // ===========================
  // GET BY ID ENDPOINT
  // ===========================

  /**
   * Obter alerta específico por ID
   *
   * Retorna todos os detalhes de um alerta, incluindo
   * informações de resolução se aplicável.
   */
  @Get(':id')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter alerta específico por ID',
    description:
      'Retorna todos os detalhes de um alerta incluindo ' +
      'informações de resolução, notificações enviadas e timestamps.',
  })
  @ApiParam({ name: 'id', description: 'ID do alerta (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Alerta recuperado com sucesso',
    type: AlertResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Organização não especificada' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão ou alerta de outra organização',
  })
  @ApiResponse({ status: 404, description: 'Alerta não encontrado' })
  async getAlertById(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<EmociogramaAlertEntity>> {
    this.validateOrganizationId(organizationId);

    const alert = await this.getAlertByIdUseCase.execute(id, organizationId);

    return ApiResponseDto.ok(alert);
  }

  // ===========================
  // RESOLVE ENDPOINT
  // ===========================

  /**
   * Resolver um alerta
   *
   * Marca o alerta como resolvido, registrando o usuário
   * que resolveu e notas opcionais sobre a resolução.
   */
  @Patch(':id/resolve')
  @Roles(Role.GESTOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar alerta como resolvido',
    description:
      'Marca um alerta como resolvido, registrando o usuário ' +
      'que resolveu e opcionalmente notas sobre as ações tomadas. ' +
      'Apenas alertas pendentes podem ser resolvidos.',
  })
  @ApiParam({ name: 'id', description: 'ID do alerta (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Alerta resolvido com sucesso',
    type: AlertResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou organização não especificada',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão - requer GESTOR ou ADMIN',
  })
  @ApiResponse({ status: 404, description: 'Alerta não encontrado' })
  @ApiResponse({ status: 409, description: 'Alerta já foi resolvido' })
  async resolveAlert(
    @Param('id') id: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<EmociogramaAlertEntity>> {
    this.validateOrganizationId(organizationId);

    // Primeiro, validar que o alerta pertence à organização
    await this.getAlertByIdUseCase.execute(id, organizationId);

    // Resolver o alerta
    const alert = await this.resolveAlertUseCase.execute(id, userId, dto.notes);

    return ApiResponseDto.ok(alert);
  }
}
