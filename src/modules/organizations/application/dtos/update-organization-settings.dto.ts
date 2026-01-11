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
