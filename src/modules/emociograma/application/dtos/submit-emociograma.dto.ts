import {
  IsInt,
  Min,
  Max,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para submissão de emociograma
 *
 * Usado para validar e documentar os dados de entrada
 * ao submeter um novo registro de estado emocional.
 */
export class SubmitEmociogramaDto {
  @ApiProperty({
    description: 'Nível de emoção (1-10)',
    minimum: 1,
    maximum: 10,
    example: 3,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  emotionLevel: number;

  @ApiProperty({
    description: 'ID da categoria de emoção',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Enviar submissão anonimamente',
    default: false,
    example: false,
  })
  @IsBoolean()
  isAnonymous: boolean;

  @ApiPropertyOptional({
    description: 'Comentário opcional sobre o estado emocional',
    maxLength: 1000,
    example: 'Estou me sentindo bem hoje, produtivo e motivado.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Departamento do colaborador',
    maxLength: 100,
    example: 'Engenharia',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({
    description: 'Equipe/time do colaborador',
    maxLength: 100,
    example: 'Backend',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  team?: string;
}
