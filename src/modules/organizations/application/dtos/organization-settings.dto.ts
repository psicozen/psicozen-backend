import {
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para validação completa das configurações da organização
 * Usado internamente para validação com @ValidateNested
 */
export class OrganizationSettingsDto {
  @ApiProperty({
    description: 'Fuso horário para exibição de data/hora (identificador IANA)',
    example: 'America/Sao_Paulo',
  })
  @IsString()
  timezone: string;

  @ApiProperty({
    description: 'Localidade para internacionalização (tag de idioma BCP 47)',
    example: 'pt-BR',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    description: 'Ativar/desativar o recurso Emociograma para esta organização',
    example: true,
  })
  @IsBoolean()
  emociogramaEnabled: boolean;

  @ApiProperty({
    description:
      'Limite do estado emocional para disparar alertas (escala 1-10)',
    example: 6,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  alertThreshold: number;

  @ApiProperty({
    description: 'Período de retenção de dados em dias (conformidade LGPD)',
    example: 365,
    minimum: 1,
    maximum: 3650,
  })
  @IsNumber()
  @Min(1)
  @Max(3650)
  dataRetentionDays: number;

  @ApiProperty({
    description: 'Configuração padrão de anonimato para envios',
    example: false,
  })
  @IsBoolean()
  anonymityDefault: boolean;
}

/**
 * DTO para atualização parcial das configurações da organização
 * Todos os campos são opcionais para permitir atualizações parciais
 */
export class PartialOrganizationSettingsDto {
  @ApiPropertyOptional({
    description: 'Fuso horário para exibição de data/hora (identificador IANA)',
    example: 'America/Sao_Paulo',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Localidade para internacionalização (tag de idioma BCP 47)',
    example: 'pt-BR',
  })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({
    description: 'Ativar/desativar o recurso Emociograma para esta organização',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emociogramaEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Limite do estado emocional para disparar alertas (escala 1-10)',
    example: 6,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  alertThreshold?: number;

  @ApiPropertyOptional({
    description: 'Período de retenção de dados em dias (conformidade LGPD)',
    example: 365,
    minimum: 1,
    maximum: 3650,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3650)
  dataRetentionDays?: number;

  @ApiPropertyOptional({
    description: 'Configuração padrão de anonimato para envios',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  anonymityDefault?: boolean;
}
