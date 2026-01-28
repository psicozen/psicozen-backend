import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para atualização de categoria de emociograma
 */
export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Nome da categoria',
    minLength: 2,
    maxLength: 50,
    example: 'Trabalho',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'O nome deve ter no máximo 50 caracteres' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Descrição da categoria',
    example: 'Emoções relacionadas ao ambiente de trabalho',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Ícone da categoria (emoji ou nome de ícone)',
    example: '💼',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Ordem de exibição na lista',
    minimum: 0,
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: 'A ordem de exibição deve ser um número inteiro' })
  @Min(0, { message: 'A ordem de exibição deve ser maior ou igual a zero' })
  displayOrder?: number;
}
