import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO de resposta para submissão de emociograma
 *
 * Representa os dados de uma submissão individual retornados pela API.
 * Usado para padronizar as respostas e documentar a estrutura de saída.
 */
export class SubmissionResponseDto {
  @ApiProperty({
    description: 'ID único da submissão',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'ID da organização',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Nível de emoção (1-10)',
    minimum: 1,
    maximum: 10,
    example: 3,
  })
  emotionLevel: number;

  @ApiProperty({
    description: 'Emoji correspondente ao nível de emoção',
    example: '😌',
  })
  emotionEmoji: string;

  @ApiProperty({
    description: 'ID da categoria de emoção',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  categoryId: string;

  @ApiProperty({
    description: 'Indica se a submissão é anônima',
    example: false,
  })
  isAnonymous: boolean;

  @ApiPropertyOptional({
    description: 'Comentário opcional sobre o estado emocional',
    example: 'Estou me sentindo bem hoje, produtivo e motivado.',
  })
  comment?: string;

  @ApiProperty({
    description: 'Indica se o comentário foi sinalizado para moderação',
    example: false,
  })
  commentFlagged: boolean;

  @ApiProperty({
    description: 'Data e hora da submissão (ISO 8601)',
    example: '2024-01-15T10:30:00.000Z',
  })
  submittedAt: Date;

  @ApiPropertyOptional({
    description: 'Departamento do colaborador',
    example: 'Engenharia',
  })
  department?: string;

  @ApiPropertyOptional({
    description: 'Equipe/time do colaborador',
    example: 'Backend',
  })
  team?: string;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * DTO de resposta para submissão anônima (dados mascarados)
 *
 * Versão da submissão com identidade do usuário ocultada.
 * Preserva departamento/equipe para agregação mas esconde ID real.
 */
export class MaskedSubmissionResponseDto {
  @ApiProperty({
    description: 'ID único da submissão',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'ID da organização',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  organizationId: string;

  @ApiProperty({
    description:
      'ID do usuário (mascarado como "anonymous" se submissão anônima)',
    example: 'anonymous',
  })
  userId: string;

  @ApiProperty({
    description: 'Nível de emoção (1-10)',
    minimum: 1,
    maximum: 10,
    example: 3,
  })
  emotionLevel: number;

  @ApiProperty({
    description: 'Emoji correspondente ao nível de emoção',
    example: '😌',
  })
  emotionEmoji: string;

  @ApiProperty({
    description: 'ID da categoria de emoção',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  categoryId: string;

  @ApiProperty({
    description: 'Indica se a submissão é anônima',
    example: true,
  })
  isAnonymous: boolean;

  @ApiPropertyOptional({
    description: 'Comentário opcional sobre o estado emocional',
    example: 'Estou me sentindo bem hoje, produtivo e motivado.',
  })
  comment?: string;

  @ApiProperty({
    description: 'Indica se o comentário foi sinalizado para moderação',
    example: false,
  })
  commentFlagged: boolean;

  @ApiProperty({
    description: 'Data e hora da submissão (ISO 8601)',
    example: '2024-01-15T10:30:00.000Z',
  })
  submittedAt: Date;

  @ApiPropertyOptional({
    description: 'Departamento do colaborador',
    example: 'Engenharia',
  })
  department?: string;

  @ApiPropertyOptional({
    description: 'Equipe/time do colaborador',
    example: 'Backend',
  })
  team?: string;
}
