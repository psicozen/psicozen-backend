import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OrganizationType } from '../../domain/types/organization-settings.types';
import { VALID_ORGANIZATION_TYPES } from '../../domain/types/organization-settings.types';

/**
 * DTO de resposta para as configurações da organização
 */
export class OrganizationSettingsResponseDto {
  @ApiProperty({
    description: 'Fuso horário para exibição de data/hora (identificador IANA)',
    example: 'America/Sao_Paulo',
  })
  timezone: string;

  @ApiProperty({
    description: 'Localidade para internacionalização (tag de idioma BCP 47)',
    example: 'pt-BR',
  })
  locale: string;

  @ApiProperty({
    description: 'Indica se o recurso Emociograma está ativo',
    example: true,
  })
  emociogramaEnabled: boolean;

  @ApiProperty({
    description:
      'Limite do estado emocional para disparar alertas (escala 1-10)',
    example: 6,
  })
  alertThreshold: number;

  @ApiProperty({
    description: 'Período de retenção de dados em dias (conformidade LGPD)',
    example: 365,
  })
  dataRetentionDays: number;

  @ApiProperty({
    description: 'Configuração padrão de anonimato para envios',
    example: false,
  })
  anonymityDefault: boolean;
}

/**
 * DTO de resposta para uma organização
 * Usado em endpoints GET e como resposta de criação/atualização
 */
export class OrganizationResponseDto {
  @ApiProperty({
    description: 'ID único da organização',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Nome da organização',
    example: 'Empresa ABC',
  })
  name: string;

  @ApiProperty({
    description: 'Slug para URL amigável',
    example: 'empresa-abc',
  })
  slug: string;

  @ApiProperty({
    description: 'Tipo da organização',
    enum: VALID_ORGANIZATION_TYPES,
    example: 'company',
  })
  type: OrganizationType;

  @ApiProperty({
    description: 'Configurações da organização',
    type: OrganizationSettingsResponseDto,
  })
  settings: OrganizationSettingsResponseDto;

  @ApiPropertyOptional({
    description: 'ID da organização pai (null se for organização raiz)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  parentId?: string | null;

  @ApiProperty({
    description: 'Indica se a organização está ativa',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Data de exclusão (soft delete)',
    example: null,
    nullable: true,
  })
  deletedAt?: Date | null;
}

/**
 * DTO de resposta para listagem de organizações (versão resumida)
 * Usado em endpoints de listagem para reduzir payload
 */
export class OrganizationSummaryResponseDto {
  @ApiProperty({
    description: 'ID único da organização',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Nome da organização',
    example: 'Empresa ABC',
  })
  name: string;

  @ApiProperty({
    description: 'Slug para URL amigável',
    example: 'empresa-abc',
  })
  slug: string;

  @ApiProperty({
    description: 'Tipo da organização',
    enum: VALID_ORGANIZATION_TYPES,
    example: 'company',
  })
  type: OrganizationType;

  @ApiPropertyOptional({
    description: 'ID da organização pai',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  parentId?: string | null;

  @ApiProperty({
    description: 'Indica se a organização está ativa',
    example: true,
  })
  isActive: boolean;
}
