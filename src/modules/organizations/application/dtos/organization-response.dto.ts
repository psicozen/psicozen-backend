import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  OrganizationType,
  OrganizationSettings,
} from '../../domain/types/organization-settings.types';

export class OrganizationResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'PsicoZen Corp' })
  name: string;

  @ApiProperty({ example: 'psicozen-corp' })
  slug: string;

  @ApiProperty({ example: 'company', enum: ['company', 'department', 'team'] })
  type: OrganizationType;

  @ApiProperty({
    example: {
      timezone: 'America/Sao_Paulo',
      locale: 'pt-BR',
      emociogramaEnabled: true,
      alertThreshold: 6,
      dataRetentionDays: 365,
      anonymityDefault: false,
    },
  })
  settings: OrganizationSettings;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  parentId?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
