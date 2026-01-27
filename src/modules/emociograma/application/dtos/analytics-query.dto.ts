import { IsDate, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para consulta de analytics da organização
 *
 * Define os parâmetros para geração de analytics avançados
 * incluindo período, filtros e limites de resultados.
 */
export class AnalyticsQueryDto {
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
    description: 'Limite de resultados para listas de mais/menos motivados',
    minimum: 1,
    maximum: 50,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;
}
