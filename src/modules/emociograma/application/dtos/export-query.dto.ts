import { IsDate, IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Formatos de exportação disponíveis para relatórios
 */
export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
}

/**
 * DTO para consulta de exportação de dados do emociograma
 *
 * Define os filtros, intervalo de tempo e formato para exportação
 * de dados do emociograma em diferentes formatos.
 */
export class ExportQueryDto {
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

  @ApiPropertyOptional({
    description: 'Formato de exportação',
    enum: ExportFormat,
    default: ExportFormat.CSV,
    example: ExportFormat.CSV,
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;
}
