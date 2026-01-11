import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import type { OrganizationType } from '../../domain/types/organization-settings.types';
import { VALID_ORGANIZATION_TYPES } from '../../domain/types/organization-settings.types';

export class OrganizationSettingsDto {
  @ApiPropertyOptional({
    example: 'America/Sao_Paulo',
    description: 'Timezone in IANA format',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    example: 'pt-BR',
    description: 'Locale in BCP 47 format',
  })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable/disable Emociograma feature',
  })
  @IsOptional()
  @IsBoolean()
  emociogramaEnabled?: boolean;

  @ApiPropertyOptional({
    example: 6,
    description: 'Alert threshold (1-10 scale)',
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  alertThreshold?: number;

  @ApiPropertyOptional({
    example: 365,
    description: 'Data retention period in days (1-3650)',
    minimum: 1,
    maximum: 3650,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3650)
  dataRetentionDays?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Default anonymity setting for submissions',
  })
  @IsOptional()
  @IsBoolean()
  anonymityDefault?: boolean;
}

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Acme Corporation',
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
  type: OrganizationType;

  @ApiPropertyOptional({
    description: 'Parent organization ID for hierarchy',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    type: OrganizationSettingsDto,
    description: 'Organization settings (optional, defaults will be applied)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationSettingsDto)
  settings?: OrganizationSettingsDto;
}
