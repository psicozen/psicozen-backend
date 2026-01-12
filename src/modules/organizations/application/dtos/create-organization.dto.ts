import {
  IsString,
  IsIn,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_ORGANIZATION_TYPES } from '../../domain/types/organization-settings.types';
import type { OrganizationType } from '../../domain/types/organization-settings.types';
import { PartialOrganizationSettingsDto } from './organization-settings.dto';

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
    description:
      'Configurações personalizadas da organização (valores padrão serão aplicados para campos não informados)',
    type: PartialOrganizationSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PartialOrganizationSettingsDto)
  settings?: PartialOrganizationSettingsDto;

  @ApiPropertyOptional({
    description: 'ID da organização pai (para hierarquia)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'O ID da organização pai deve ser um UUID válido' })
  parentId?: string;
}
