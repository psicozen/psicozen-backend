import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO de resposta para categoria de emociograma
 *
 * Representa os dados de uma categoria retornados pela API.
 * Usado para padronizar as respostas e documentar a estrutura de saída.
 */
export class CategoryResponseDto {
  @ApiProperty({
    description: 'ID único da categoria',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Nome da categoria',
    example: 'Trabalho',
  })
  name: string;

  @ApiProperty({
    description: 'Slug URL-friendly da categoria',
    example: 'trabalho',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Descrição da categoria',
    example: 'Emoções relacionadas ao ambiente de trabalho',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Ícone da categoria (emoji ou nome de ícone)',
    example: '💼',
  })
  icon?: string;

  @ApiProperty({
    description: 'Ordem de exibição na lista',
    example: 1,
  })
  displayOrder: number;

  @ApiProperty({
    description: 'Indica se a categoria está ativa',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Data de criação da categoria',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * DTO de resposta resumida para categoria (usado em seletores)
 *
 * Versão compacta da categoria para exibição em dropdowns e seletores.
 */
export class CategorySummaryResponseDto {
  @ApiProperty({
    description: 'ID único da categoria',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Nome da categoria',
    example: 'Trabalho',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Ícone da categoria (emoji ou nome de ícone)',
    example: '💼',
  })
  icon?: string;

  @ApiProperty({
    description: 'Indica se a categoria está ativa',
    example: true,
  })
  isActive: boolean;
}
