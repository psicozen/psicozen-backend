import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para consulta de relatório agregado do emociograma
 *
 * Define os filtros e intervalo de tempo para geração
 * do relatório com estatísticas agregadas.
 */
export class AggregatedReportDto {
  @ApiProperty({
    description: 'Data de início do período (ISO 8601)',
    type: String,
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({
    description: 'Data de fim do período (ISO 8601)',
    type: String,
    example: '2024-01-31T23:59:59.999Z',
  })
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiPropertyOptional({
    description: 'Filtrar por departamento',
    example: 'Engenharia',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por equipe/time',
    example: 'Backend',
  })
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID da categoria de emoção',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
