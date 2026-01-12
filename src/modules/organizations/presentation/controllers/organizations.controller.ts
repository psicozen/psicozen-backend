import {
  Controller,
  Get,
  Post,
  Put,
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
import {
  PaginationDto,
  ApiResponseDto,
} from '../../../../core/application/dtos';
import {
  CreateOrganizationUseCase,
  GetOrganizationByIdUseCase,
  UpdateOrganizationSettingsUseCase,
  DeleteOrganizationUseCase,
  ListOrganizationsUseCase,
} from '../../application/use-cases';
import {
  CreateOrganizationDto,
  UpdateOrganizationSettingsDto,
  OrganizationResponseDto,
} from '../../application/dtos';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly getOrganizationByIdUseCase: GetOrganizationByIdUseCase,
    private readonly updateOrganizationSettingsUseCase: UpdateOrganizationSettingsUseCase,
    private readonly deleteOrganizationUseCase: DeleteOrganizationUseCase,
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: OrganizationResponseDto,
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
  @ApiOperation({ summary: 'List all organizations with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
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
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Organization UUID' })
  @ApiResponse({
    status: 200,
    description: 'Organization found',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('id') id: string) {
    const organization = await this.getOrganizationByIdUseCase.execute(id);
    return ApiResponseDto.ok(organization);
  }

  @Put(':id/settings')
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiParam({ name: 'id', type: String, description: 'Organization UUID' })
  @ApiResponse({
    status: 200,
    description: 'Organization settings updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization (soft delete)' })
  @ApiParam({ name: 'id', type: String, description: 'Organization UUID' })
  @ApiResponse({
    status: 204,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async remove(@Param('id') id: string) {
    await this.deleteOrganizationUseCase.execute(id, false);
  }
}
