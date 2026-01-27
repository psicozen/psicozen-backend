import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  AlertSeverity,
  AlertType,
} from '../../domain/entities/alert.entity';

/**
 * DTO de resposta para alerta do emociograma
 *
 * Representa os dados de um alerta retornado pela API.
 * Usado para padronizar as respostas e documentar a estrutura de saída.
 */
export class AlertResponseDto {
  @ApiProperty({
    description: 'ID único do alerta',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'ID da organização',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  organizationId: string;

  @ApiProperty({
    description: 'ID da submissão que gerou o alerta',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  submissionId: string;

  @ApiProperty({
    description: 'Tipo do alerta',
    enum: ['threshold_exceeded', 'pattern_detected'],
    example: 'threshold_exceeded',
  })
  alertType: AlertType;

  @ApiProperty({
    description: 'Severidade do alerta',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
  })
  severity: AlertSeverity;

  @ApiProperty({
    description: 'Mensagem descritiva do alerta',
    example:
      'Colaborador reportou estado emocional Triste 😢 (Nível 7/10). Equipe: Backend.',
  })
  message: string;

  @ApiProperty({
    description: 'Indica se o alerta foi resolvido',
    example: false,
  })
  isResolved: boolean;

  @ApiPropertyOptional({
    description: 'Data e hora da resolução (ISO 8601)',
    example: '2024-01-15T14:30:00.000Z',
  })
  resolvedAt?: Date;

  @ApiPropertyOptional({
    description: 'ID do usuário que resolveu o alerta',
    example: 'd4e5f6a7-b8c9-0123-def0-234567890123',
  })
  resolvedBy?: string;

  @ApiPropertyOptional({
    description: 'Notas de resolução com detalhes das ações tomadas',
    example:
      'Conversei com o colaborador, identificamos sobrecarga de trabalho.',
  })
  resolutionNotes?: string;

  @ApiProperty({
    description: 'Lista de IDs dos usuários notificados',
    type: [String],
    example: ['e5f6a7b8-c9d0-1234-ef01-345678901234'],
  })
  notifiedUsers: string[];

  @ApiPropertyOptional({
    description: 'Data e hora do envio das notificações (ISO 8601)',
    example: '2024-01-15T10:35:00.000Z',
  })
  notificationSentAt?: Date;

  @ApiProperty({
    description: 'Data de criação do alerta',
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
 * DTO de resposta resumida para alerta (usado em listagens)
 *
 * Versão compacta do alerta para exibição em dashboards e listagens,
 * sem detalhes de resolução para reduzir tamanho do payload.
 */
export class AlertSummaryResponseDto {
  @ApiProperty({
    description: 'ID único do alerta',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'ID da organização',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  organizationId: string;

  @ApiProperty({
    description: 'ID da submissão que gerou o alerta',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  submissionId: string;

  @ApiProperty({
    description: 'Tipo do alerta',
    enum: ['threshold_exceeded', 'pattern_detected'],
    example: 'threshold_exceeded',
  })
  alertType: AlertType;

  @ApiProperty({
    description: 'Severidade do alerta',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
  })
  severity: AlertSeverity;

  @ApiProperty({
    description: 'Mensagem descritiva do alerta',
    example:
      'Colaborador reportou estado emocional Triste 😢 (Nível 7/10). Equipe: Backend.',
  })
  message: string;

  @ApiProperty({
    description: 'Indica se o alerta foi resolvido',
    example: false,
  })
  isResolved: boolean;

  @ApiProperty({
    description: 'Data de criação do alerta',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;
}

/**
 * DTO de resposta para dashboard de alertas
 *
 * Contém estatísticas agregadas de alertas para exibição em dashboard.
 */
export class AlertDashboardResponseDto {
  @ApiProperty({
    description: 'Total de alertas pendentes',
    example: 5,
  })
  pendingCount: number;

  @ApiProperty({
    description: 'Total de alertas resolvidos',
    example: 12,
  })
  resolvedCount: number;

  @ApiProperty({
    description: 'Total de alertas com severidade crítica pendentes',
    example: 1,
  })
  criticalCount: number;

  @ApiProperty({
    description: 'Total de alertas com severidade alta pendentes',
    example: 2,
  })
  highCount: number;

  @ApiProperty({
    description: 'Total de alertas com severidade média pendentes',
    example: 2,
  })
  mediumCount: number;

  @ApiProperty({
    description: 'Lista dos alertas mais recentes (máx 10)',
    type: [AlertSummaryResponseDto],
  })
  recentAlerts: AlertSummaryResponseDto[];
}
