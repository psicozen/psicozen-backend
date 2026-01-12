import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsUUID,
  MinLength,
  MaxLength,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_ORGANIZATION_TYPES } from '../../domain/types/organization-settings.types';

export class OrganizationSettingsDto {
  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'pt-BR' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emociogramaEnabled?: boolean;

  @ApiPropertyOptional({ example: 6, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  alertThreshold?: number;

  @ApiPropertyOptional({ example: 365, minimum: 1, maximum: 3650 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3650)
  dataRetentionDays?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  anonymityDefault?: boolean;
}

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'PsicoZen Corp',
    description: 'Organization name (3-100 characters)',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'company',
    description: 'Organization type',
    enum: VALID_ORGANIZATION_TYPES,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_ORGANIZATION_TYPES)
  type: 'company' | 'department' | 'team';

  @ApiPropertyOptional({
    type: OrganizationSettingsDto,
    description: 'Organization settings (optional, defaults will be applied)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationSettingsDto)
  settings?: OrganizationSettingsDto;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Parent organization UUID (for hierarchical structure)',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
