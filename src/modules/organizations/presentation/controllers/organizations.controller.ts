import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/presentation/guards/roles.guard';
import { Roles } from '../../../../core/presentation/decorators/roles.decorator';
import { Role } from '../../../roles/domain/enums/role.enum';
import {
  PaginationDto,
  ApiResponseDto,
} from '../../../../core/application/dtos';
import {
  CreateOrganizationUseCase,
  GetOrganizationUseCase,
  ListOrganizationsUseCase,
  UpdateOrganizationSettingsUseCase,
  DeleteOrganizationUseCase,
} from '../../application/use-cases';
import {
  CreateOrganizationDto,
  UpdateOrganizationSettingsDto,
  OrganizationResponseDto,
} from '../../application/dtos';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly getOrganizationUseCase: GetOrganizationUseCase,
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase,
    private readonly updateOrganizationSettingsUseCase: UpdateOrganizationSettingsUseCase,
    private readonly deleteOrganizationUseCase: DeleteOrganizationUseCase,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new organization (SUPER_ADMIN only)' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires SUPER_ADMIN role',
  })
  @ApiResponse({
    status: 409,
    description: 'Organization with this name already exists',
  })
  async create(@Body() dto: CreateOrganizationDto) {
    const organization = await this.createOrganizationUseCase.execute(dto);
    return ApiResponseDto.ok(organization);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all organizations with pagination (ADMIN)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  async findAll(@Query() pagination: PaginationDto) {
    const result = await this.listOrganizationsUseCase.execute(pagination);
    return ApiResponseDto.paginated(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get organization by ID (ADMIN)' })
  @ApiParam({ name: 'id', type: String, description: 'Organization UUID' })
  @ApiResponse({
    status: 200,
    description: 'Organization found',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('id') id: string) {
    const organization = await this.getOrganizationUseCase.execute(id);
    return ApiResponseDto.ok(organization);
  }

  @Patch(':id/settings')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update organization settings (ADMIN)' })
  @ApiParam({ name: 'id', type: String, description: 'Organization UUID' })
  @ApiResponse({
    status: 200,
    description: 'Organization settings updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 400, description: 'Invalid settings values' })
  async updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    const organization = await this.updateOrganizationSettingsUseCase.execute(
      id,
      dto,
    );
    return ApiResponseDto.ok(organization);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete organization (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', type: String, description: 'Organization UUID' })
  @ApiResponse({
    status: 204,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires SUPER_ADMIN role',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete organization with children',
  })
  async remove(@Param('id') id: string) {
    await this.deleteOrganizationUseCase.execute(id);
  }
}
