import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OrganizationType } from '../../domain/types/organization-settings.types';

export class OrganizationSettingsResponseDto {
  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone: string;

  @ApiProperty({ example: 'pt-BR' })
  locale: string;

  @ApiProperty({ example: true })
  emociogramaEnabled: boolean;

  @ApiProperty({ example: 6 })
  alertThreshold: number;

  @ApiProperty({ example: 365 })
  dataRetentionDays: number;

  @ApiProperty({ example: false })
  anonymityDefault: boolean;
}

export class OrganizationResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Acme Corporation' })
  name: string;

  @ApiProperty({ example: 'acme-corporation' })
  slug: string;

  @ApiProperty({ example: 'company', enum: ['company', 'department', 'team'] })
  type: OrganizationType;

  @ApiProperty({ type: OrganizationSettingsResponseDto })
  settings: OrganizationSettingsResponseDto;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  parentId?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date | null;
}
