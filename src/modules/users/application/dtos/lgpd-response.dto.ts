import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para resposta de operações LGPD
 */
export class LgpdOperationResponseDto {
  @ApiProperty({ description: 'Indica se a operação foi bem sucedida' })
  success: boolean;

  @ApiProperty({ description: 'Mensagem descritiva do resultado' })
  message: string;

  @ApiProperty({ description: 'Timestamp da operação' })
  timestamp: Date;
}

/**
 * DTO para exportação de perfil do usuário
 */
export class UserProfileExportDto {
  @ApiProperty({ description: 'ID do usuário' })
  id: string;

  @ApiProperty({ description: 'Email do usuário' })
  email: string;

  @ApiPropertyOptional({ description: 'Primeiro nome' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Sobrenome' })
  lastName?: string;

  @ApiProperty({ description: 'Data de criação da conta' })
  createdAt: Date;
}

/**
 * DTO para exportação de submissão
 */
export class SubmissionExportDto {
  @ApiProperty({ description: 'Data da submissão' })
  submittedAt: Date;

  @ApiProperty({ description: 'Nível de emoção (1-5)' })
  emotionLevel: number;

  @ApiProperty({ description: 'Emoji da emoção' })
  emotionEmoji: string;

  @ApiProperty({ description: 'ID da categoria' })
  categoryId: string;

  @ApiPropertyOptional({ description: 'Comentário (se não anônimo)' })
  comment?: string;

  @ApiProperty({ description: 'Se a submissão é anônima' })
  isAnonymous: boolean;

  @ApiPropertyOptional({ description: 'Departamento' })
  department?: string;

  @ApiPropertyOptional({ description: 'Equipe' })
  team?: string;
}

/**
 * DTO para exportação completa de dados do usuário (LGPD Art. 18, IV)
 */
export class UserDataExportDto {
  @ApiProperty({ description: 'Dados do perfil', type: UserProfileExportDto })
  profile: UserProfileExportDto;

  @ApiProperty({
    description: 'Lista de submissões',
    type: [SubmissionExportDto],
  })
  submissions: SubmissionExportDto[];

  @ApiProperty({ description: 'Data/hora da exportação' })
  exportedAt: Date;

  @ApiProperty({ description: 'Formato dos dados', example: 'json' })
  format: 'json';
}

/**
 * DTO para trilha de auditoria
 */
export class AuditTrailEntryDto {
  @ApiProperty({ description: 'ID do registro' })
  id: string;

  @ApiProperty({ description: 'Tipo de ação realizada' })
  action: string;

  @ApiProperty({ description: 'ID do usuário' })
  userId: string;

  @ApiPropertyOptional({ description: 'ID da organização' })
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Metadados adicionais' })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Data/hora da ação' })
  createdAt: Date;
}

/**
 * DTO para resposta da trilha de auditoria
 */
export class AuditTrailResponseDto {
  @ApiProperty({ description: 'Registros de auditoria', type: [AuditTrailEntryDto] })
  data: AuditTrailEntryDto[];

  @ApiProperty({ description: 'Total de registros' })
  total: number;
}
