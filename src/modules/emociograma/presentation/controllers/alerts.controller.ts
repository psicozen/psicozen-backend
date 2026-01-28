import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
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
import { GetAlertDashboardUseCase } from '../../application/use-cases/get-alert-dashboard.use-case';
import type { AlertDashboardResponse } from '../../application/use-cases/get-alert-dashboard.use-case';
import { ResolveAlertUseCase } from '../../application/use-cases/resolve-alert.use-case';
import { ListAlertsUseCase } from '../../application/use-cases/list-alerts.use-case';
import { GetAlertByIdUseCase } from '../../application/use-cases/get-alert-by-id.use-case';
import { ResolveAlertDto } from '../../application/dtos/resolve-alert.dto';
import { AlertsQueryDto } from '../../application/dtos/alerts-query.dto';
import type { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';

/**
 * Controller de Alertas do Emociograma
 *
 * Gerencia as operações de visualização e resolução de alertas emocionais.
 * Todos os endpoints requerem autenticação e role GESTOR ou ADMIN.
 *
 * Endpoints:
 * - GET /alerts - Listar alertas com paginação e filtros
 * - GET /alerts/dashboard - Resumo do dashboard de alertas
 * - GET /alerts/:id - Obter alerta específico
 * - PATCH /alerts/:id/resolve - Marcar alerta como resolvido
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
   */
  @Get('dashboard')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter resumo do dashboard de alertas',
    description:
      'Retorna estatísticas consolidadas de alertas e os alertas não resolvidos mais recentes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard de alertas recuperado com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Header x-organization-id ausente' })
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
   * Listar alertas com paginação e filtros
   */
  @Get()
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Listar alertas',
    description:
      'Retorna lista paginada de alertas com opções de filtro por severidade e status.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @ApiQuery({
    name: 'includeResolved',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de alertas recuperada com sucesso',
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

    const result = await this.listAlertsUseCase.execute(organizationId, query);

    return ApiResponseDto.paginated(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  // ===========================
  // GET BY ID ENDPOINT
  // ===========================

  /**
   * Obter alerta específico por ID
   */
  @Get(':id')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter alerta específico',
    description: 'Recupera os detalhes de um alerta específico pelo seu ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do alerta (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Alerta recuperado com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Header x-organization-id ausente' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para acessar este alerta',
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
   * Marcar alerta como resolvido
   */
  @Patch(':id/resolve')
  @Roles(Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Resolver alerta',
    description:
      'Marca um alerta como resolvido, registrando quem resolveu e notas opcionais.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do alerta (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Alerta resolvido com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
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

    const alert = await this.resolveAlertUseCase.execute(
      id,
      userId,
      dto.notes,
    );

    return ApiResponseDto.ok(alert);
  }
}
