import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import type { AlertSeverity } from '../../domain/entities/alert.entity';

/**
 * DTO para consulta de alertas com paginação e filtros
 */
export class AlertsQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de itens por página',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filtrar por severidade',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity?: AlertSeverity;

  @ApiPropertyOptional({
    description: 'Incluir alertas já resolvidos',
    default: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeResolved?: boolean = false;
}
