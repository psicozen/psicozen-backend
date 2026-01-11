import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  IsNumber,
  IsUUID,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OrganizationType } from '../../domain/types/organization-settings.types';
import { VALID_ORGANIZATION_TYPES } from '../../domain/types/organization-settings.types';

/**
 * DTO para configurações parciais da organização
 */
export class OrganizationSettingsDto {
  @ApiPropertyOptional({
    example: 'America/Sao_Paulo',
    description: 'Fuso horário no formato IANA',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    example: 'pt-BR',
    description: 'Localidade no formato BCP 47',
  })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Ativar/desativar o recurso Emociograma',
  })
  @IsOptional()
  @IsBoolean()
  emociogramaEnabled?: boolean;

  @ApiPropertyOptional({
    example: 6,
    description: 'Limite de alerta (escala 1-10)',
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'O limite de alerta deve ser no mínimo 1' })
  @Max(10, { message: 'O limite de alerta deve ser no máximo 10' })
  alertThreshold?: number;

  @ApiPropertyOptional({
    example: 365,
    description: 'Período de retenção de dados em dias (1-3650)',
    minimum: 1,
    maximum: 3650,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'O período de retenção deve ser no mínimo 1 dia' })
  @Max(3650, { message: 'O período de retenção deve ser no máximo 3650 dias' })
  dataRetentionDays?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Configuração padrão de anonimato para envios',
  })
  @IsOptional()
  @IsBoolean()
  anonymityDefault?: boolean;
}

/**
 * DTO para criação de uma nova organização
 * Validações espelham as regras de negócio do domínio
 */
export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Nome da organização',
    example: 'Empresa ABC',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3, {
    message: 'O nome da organização deve ter no mínimo 3 caracteres',
  })
  @MaxLength(100, {
    message: 'O nome da organização deve ter no máximo 100 caracteres',
  })
  name: string;

  @ApiProperty({
    description: 'Tipo da organização',
    enum: VALID_ORGANIZATION_TYPES,
    example: 'company',
  })
  @IsIn(VALID_ORGANIZATION_TYPES, {
    message: 'O tipo da organização deve ser: company, department ou team',
  })
  type: OrganizationType;

  @ApiPropertyOptional({
    description: 'ID da organização pai (para hierarquia)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'O ID da organização pai deve ser um UUID válido' })
  parentId?: string;

  @ApiPropertyOptional({
    description:
      'Configurações personalizadas da organização (valores padrão serão aplicados para campos não informados)',
    type: OrganizationSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationSettingsDto)
  settings?: OrganizationSettingsDto;
}
