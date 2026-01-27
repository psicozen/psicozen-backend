import { IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para resolução de alertas do emociograma
 *
 * Usado para registrar quando um gestor/admin toma conhecimento
 * de um alerta e documenta as ações tomadas.
 */
export class ResolveAlertDto {
  @ApiPropertyOptional({
    description: 'Notas de resolução com detalhes das ações tomadas',
    maxLength: 500,
    example:
      'Conversei com o colaborador, identificamos sobrecarga de trabalho. Redistribuindo tarefas.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
