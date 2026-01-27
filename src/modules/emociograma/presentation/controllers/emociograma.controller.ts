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
} from '../../application/use-cases';
import {
  SubmitEmociogramaDto,
  SubmissionResponseDto,
} from '../../application/dtos';
import type { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import type { MaskedSubmissionData } from '../../domain/entities/submission.entity';

/**
 * Controller do Emociograma - Endpoints de Submissão
 *
 * Gerencia as operações de submissão de estado emocional dos colaboradores.
 * Todos os endpoints requerem autenticação e contexto de organização.
 *
 * Endpoints:
 * - POST /emociograma - Enviar estado emocional
 * - GET /emociograma/my-submissions - Obter histórico próprio
 * - GET /emociograma/submission/:id - Obter submissão específica
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
  ) {}

  /**
   * Enviar estado emocional diário
   *
   * Permite que colaboradores enviem seu estado emocional diário.
   * Dispara alertas automaticamente se o nível de emoção for >= 6.
   * Suporta submissões anônimas para maior privacidade.
   */
  @Post()
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Enviar estado emocional diário',
    description:
      'Colaboradores enviam seu estado emocional diário com anonimato opcional. ' +
      'Dispara alertas automaticamente se nível de emoção >= 6 (emoções negativas).',
  })
  @ApiResponse({
    status: 201,
    description: 'Submissão criada com sucesso',
    type: SubmissionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou organização não especificada',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Emociograma desabilitado para esta organização',
  })
  async submit(
    @Body() dto: SubmitEmociogramaDto,
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<
    ApiResponseDto<EmociogramaSubmissionEntity | MaskedSubmissionData>
  > {
    if (!organizationId) {
      throw new BadRequestException('Header x-organization-id é obrigatório');
    }

    const submission = await this.submitUseCase.execute(
      dto,
      userId,
      organizationId,
    );

    return ApiResponseDto.ok(submission);
  }

  /**
   * Obter histórico de submissões do próprio usuário
   *
   * Retorna lista paginada das submissões de emociograma do usuário autenticado.
   * Ordenado por data de submissão (mais recentes primeiro).
   */
  @Get('my-submissions')
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter meu histórico de submissões',
    description:
      'Recupera lista paginada de submissões emocionais próprias do usuário autenticado.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página (padrão: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 10, máx: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Submissões recuperadas com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Organização não especificada',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  async getMySubmissions(
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
    @Query() pagination: PaginationDto,
  ): Promise<ApiResponseDto<EmociogramaSubmissionEntity[]>> {
    if (!organizationId) {
      throw new BadRequestException('Header x-organization-id é obrigatório');
    }

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
   *
   * Recupera uma submissão específica. Controle de acesso:
   * - COLABORADOR: Só pode ver suas próprias submissões
   * - GESTOR/ADMIN: Pode ver qualquer submissão da organização
   *
   * Para submissões anônimas de outros usuários, retorna dados mascarados.
   */
  @Get('submission/:id')
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obter submissão específica por ID',
    description:
      'Recupera uma submissão específica. Colaboradores só podem ver suas próprias submissões. ' +
      'Gestores e admins podem ver qualquer submissão (dados mascarados se anônima).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da submissão (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Submissão recuperada com sucesso',
    type: SubmissionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Organização não especificada',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para ver esta submissão',
  })
  @ApiResponse({
    status: 404,
    description: 'Submissão não encontrada',
  })
  async getSubmissionById(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<
    ApiResponseDto<EmociogramaSubmissionEntity | MaskedSubmissionData>
  > {
    if (!organizationId) {
      throw new BadRequestException('Header x-organization-id é obrigatório');
    }

    const submission = await this.getSubmissionByIdUseCase.execute(
      id,
      user.id,
      organizationId,
      user.role as Role | undefined,
    );

    return ApiResponseDto.ok(submission);
  }
}
