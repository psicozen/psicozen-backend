import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enum de severidades de alerta para validação
 */
export enum AlertSeverityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * DTO para consulta de listagem de alertas
 *
 * Define os parâmetros de paginação e filtros para a listagem
 * de alertas do emociograma.
 */
export class AlertsQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página (1-indexed)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de itens por página',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por severidade do alerta',
    enum: AlertSeverityEnum,
    example: 'high',
  })
  @IsOptional()
  @IsEnum(AlertSeverityEnum)
  severity?: AlertSeverityEnum;

  @ApiPropertyOptional({
    description: 'Incluir alertas já resolvidos na listagem',
    default: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeResolved?: boolean;
}
