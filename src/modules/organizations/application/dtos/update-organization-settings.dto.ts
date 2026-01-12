import {
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para atualização das configurações da organização
 * Todos os campos são opcionais para permitir atualizações parciais
 * Validações espelham as regras de negócio do domínio (OrganizationEntity.updateSettings)
 */
export class UpdateOrganizationSettingsDto {
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
  @Min(1, { message: 'O limite de alerta deve ser no mínimo 1' })
  @Max(10, { message: 'O limite de alerta deve ser no máximo 10' })
  alertThreshold?: number;

  @ApiPropertyOptional({
    description: 'Período de retenção de dados em dias (conformidade LGPD)',
    example: 365,
    minimum: 1,
    maximum: 3650,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'O período de retenção deve ser no mínimo 1 dia' })
  @Max(3650, {
    message: 'O período de retenção deve ser no máximo 3650 dias (10 anos)',
  })
  dataRetentionDays?: number;

  @ApiPropertyOptional({
    description: 'Configuração padrão de anonimato para envios',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  anonymityDefault?: boolean;
}

/**
 * DTO para atualização dos detalhes da organização (nome e hierarquia)
 * Validações espelham as regras de negócio do domínio (OrganizationEntity.updateDetails)
 */
export class UpdateOrganizationDetailsDto {
  @ApiPropertyOptional({
    description: 'Nome da organização',
    example: 'Empresa ABC Atualizada',
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, {
    message: 'O nome da organização deve ter no mínimo 3 caracteres',
  })
  @MaxLength(100, {
    message: 'O nome da organização deve ter no máximo 100 caracteres',
  })
  name?: string;

  @ApiPropertyOptional({
    description:
      'Slug personalizado para URL amigável (se não informado, será gerado a partir do nome)',
    example: 'empresa-abc-atualizada',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'O slug deve ter no máximo 120 caracteres' })
  slug?: string;

  @ApiPropertyOptional({
    description: 'ID da organização pai (null para remover hierarquia)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'O ID da organização pai deve ser um UUID válido' })
  parentId?: string | null;
}
