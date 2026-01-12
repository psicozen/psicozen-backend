import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional({
    example: 'America/Sao_Paulo',
    description: 'IANA timezone identifier',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    example: 'pt-BR',
    description: 'BCP 47 language tag',
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
    minimum: 1,
    maximum: 10,
    description: 'Alert threshold on 1-10 scale',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  alertThreshold?: number;

  @ApiPropertyOptional({
    example: 365,
    minimum: 1,
    maximum: 3650,
    description: 'Data retention period in days (LGPD compliance)',
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
