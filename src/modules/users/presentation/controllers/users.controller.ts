import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../../auth/presentation/guards/supabase-auth.guard';
import { RolesGuard } from '../../../../core/presentation/guards/roles.guard';
import { Roles } from '../../../../core/presentation/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/presentation/decorators/current-user.decorator';
import { Role } from '../../../roles/domain/enums/role.enum';
import {
  PaginationDto,
  ApiResponseDto,
} from '../../../../core/application/dtos';
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  GetUserUseCase,
  DeleteUserUseCase,
  ListUsersUseCase,
} from '../../application/use-cases';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  UserDataExportDto,
  LgpdOperationResponseDto,
  AuditTrailResponseDto,
} from '../../application/dtos';
import { DataAnonymizationService } from '../../../emociograma/application/services/data-anonymization.service';
import { AUDIT_LOG_SERVICE } from '../../../../core/application/services/audit-log.service.interface';
import type { IAuditLogService } from '../../../../core/application/services/audit-log.service.interface';
import { EmailService } from '../../../emails/infrastructure/services/email.service';

@ApiTags('users')
@Controller('users')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly dataAnonymizationService: DataAnonymizationService,
    @Inject(AUDIT_LOG_SERVICE)
    private readonly auditLogService: IAuditLogService,
    private readonly emailService: EmailService,
  ) {}

  // ==========================================
  // CRUD Endpoints
  // ==========================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'User with email already exists' })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.createUserUseCase.execute(dto);
    return ApiResponseDto.ok(user);
  }

  @Get()
  @ApiOperation({ summary: 'List all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() pagination: PaginationDto) {
    const result = await this.listUsersUseCase.execute(pagination);
    return ApiResponseDto.paginated(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.getUserUseCase.execute(userId);
    return ApiResponseDto.ok(user);
  }

  // ==========================================
  // LGPD Endpoints (Artigo 18)
  // ==========================================

  @Get('data-export')
  @UseGuards(RolesGuard)
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Exportar meus dados pessoais (LGPD Artigo 18, IV)',
    description:
      'Baixar todos os dados pessoais em formato JSON legível por máquina. Inclui perfil e todas as submissões de emociograma.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'ID da organização',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Dados exportados com sucesso',
    type: UserDataExportDto,
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async exportMyData(
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<UserDataExportDto>> {
    const data = await this.dataAnonymizationService.exportUserData(
      userId,
      organizationId,
    );
    return ApiResponseDto.ok(data as UserDataExportDto);
  }

  @Post('data-anonymize')
  @UseGuards(RolesGuard)
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Anonimizar meus dados (LGPD Artigo 18, II)',
    description:
      'Anonimizar todas as submissões de emociograma, definindo-as como anônimas e removendo comentários. Esta ação é irreversível.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'ID da organização',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Dados anonimizados com sucesso',
    type: LgpdOperationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async anonymizeMyData(
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<LgpdOperationResponseDto>> {
    const result = await this.dataAnonymizationService.anonymizeUserData(
      userId,
      organizationId,
    );
    return ApiResponseDto.ok(result as LgpdOperationResponseDto);
  }

  @Delete('data-deletion')
  @UseGuards(RolesGuard)
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar exclusão de dados (LGPD Artigo 18, VI)',
    description:
      'Solicitar exclusão permanente de todas as submissões. Esta ação é irreversível e requer confirmação por email.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'ID da organização',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description:
      'Exclusão de dados solicitada. Verifique seu email para link de confirmação.',
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async requestDataDeletion(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') userEmail: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<LgpdOperationResponseDto>> {
    // Registrar a solicitação na trilha de auditoria
    await this.auditLogService.log({
      action: 'data_deletion_requested',
      userId,
      organizationId,
      metadata: {
        timestamp: new Date().toISOString(),
        email: userEmail,
        article: 'LGPD Art. 18, VI',
      },
    });

    // Enviar email de confirmação
    await this.emailService.sendDataDeletionConfirmation(
      userEmail,
      userId,
      organizationId,
    );

    return ApiResponseDto.ok({
      success: true,
      message:
        'Exclusão de dados solicitada. Por favor, verifique seu email para confirmar esta ação.',
      timestamp: new Date(),
    });
  }

  @Get('audit-trail')
  @UseGuards(RolesGuard)
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Visualizar minha trilha de auditoria',
    description:
      'Ver todas as operações de dados realizadas na minha conta (exportações, anonimizações, exclusões).',
  })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'ID da organização',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Trilha de auditoria recuperada',
    type: AuditTrailResponseDto,
  })
  async getMyAuditTrail(
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId?: string,
  ): Promise<ApiResponseDto<AuditTrailResponseDto>> {
    const result = await this.auditLogService.getAuditTrail(
      userId,
      organizationId,
    );
    return ApiResponseDto.ok({
      data: result.data.map((log) => ({
        id: log.id,
        action: log.action,
        userId: log.userId,
        organizationId: log.organizationId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      total: result.total,
    });
  }

  // ==========================================
  // Standard CRUD Endpoints (continued)
  // ==========================================

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    const user = await this.getUserUseCase.execute(id);
    return ApiResponseDto.ok(user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.updateUserUseCase.execute(id, dto);
    return ApiResponseDto.ok(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    await this.deleteUserUseCase.execute(id, false);
  }
}
