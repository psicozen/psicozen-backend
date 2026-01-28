import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { AUDIT_LOG_SERVICE } from '../../../../core/application/services/audit-log.service.interface';
import type { IAuditLogService } from '../../../../core/application/services/audit-log.service.interface';

/**
 * Dados do perfil do usuário para exportação
 */
export interface UserProfileExport {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
}

/**
 * Dados de uma submissão para exportação
 */
export interface SubmissionExport {
  submittedAt: Date;
  emotionLevel: number;
  emotionEmoji: string;
  categoryId: string;
  comment?: string;
  isAnonymous: boolean;
  department?: string;
  team?: string;
}

/**
 * Estrutura completa de exportação de dados do usuário
 * Conforme LGPD Artigo 18, IV - Direito à Portabilidade de Dados
 */
export interface UserDataExport {
  profile: UserProfileExport;
  submissions: SubmissionExport[];
  exportedAt: Date;
  format: 'json';
}

/**
 * Resultado de operação de anonimização
 */
export interface AnonymizationResult {
  success: boolean;
  message: string;
  timestamp: Date;
}

/**
 * Resultado de operação de exclusão
 */
export interface DeletionResult {
  success: boolean;
  message: string;
  timestamp: Date;
}

/**
 * Serviço de Anonimização de Dados
 *
 * Implementa operações de conformidade LGPD para dados do emociograma:
 * - Anonimização de dados (Artigo 18, II)
 * - Exportação de dados (Artigo 18, IV - Portabilidade)
 * - Exclusão de dados (Artigo 18, VI - Direito ao Apagamento)
 *
 * Todas as operações são registradas em trilha de auditoria.
 */
@Injectable()
export class DataAnonymizationService {
  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(AUDIT_LOG_SERVICE)
    private readonly auditLogService: IAuditLogService,
  ) {}

  /**
   * Anonimizar todas as submissões do usuário (LGPD Artigo 18, II)
   *
   * Define todas as submissões como anônimas e remove comentários,
   * preservando os dados agregados para análise estatística.
   *
   * @param userId - ID do usuário
   * @param organizationId - ID da organização
   * @returns Resultado da operação
   */
  async anonymizeUserData(
    userId: string,
    organizationId: string,
  ): Promise<AnonymizationResult> {
    // 1. Verificar se o usuário existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // 2. Anonimizar todas as submissões
    await this.submissionRepository.anonymizeByUser(userId, organizationId);

    // 3. Registrar na trilha de auditoria
    await this.auditLogService.log({
      action: 'user_data_anonymized',
      userId,
      organizationId,
      metadata: {
        timestamp: new Date().toISOString(),
        reason: 'LGPD_compliance',
        article: 'LGPD Art. 18, II',
      },
    });

    return {
      success: true,
      message: 'Dados do usuário anonimizados com sucesso',
      timestamp: new Date(),
    };
  }

  /**
   * Exportar dados do usuário (LGPD Artigo 18, IV - Direito à Portabilidade)
   *
   * Retorna todos os dados pessoais do usuário em formato legível por máquina (JSON).
   * Inclui perfil e todas as submissões de emociograma.
   *
   * @param userId - ID do usuário
   * @param organizationId - ID da organização
   * @returns Dados do usuário em formato exportável
   */
  async exportUserData(
    userId: string,
    organizationId: string,
  ): Promise<UserDataExport> {
    // 1. Obter perfil do usuário
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // 2. Obter todas as submissões (incluindo anônimas)
    const submissionsResult = await this.submissionRepository.findByUser(
      userId,
      organizationId,
      {
        take: 10000, // Limite máximo para garantir exportação completa
        skip: 0,
      },
    );

    // 3. Formatar dados para exportação
    const exportData: UserDataExport = {
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
      submissions: submissionsResult.data.map((sub) => ({
        submittedAt: sub.submittedAt,
        emotionLevel: sub.emotionLevel,
        emotionEmoji: sub.emotionEmoji,
        categoryId: sub.categoryId,
        comment: sub.comment,
        isAnonymous: sub.isAnonymous,
        department: sub.department,
        team: sub.team,
      })),
      exportedAt: new Date(),
      format: 'json',
    };

    // 4. Registrar na trilha de auditoria
    await this.auditLogService.log({
      action: 'user_data_exported',
      userId,
      organizationId,
      metadata: {
        timestamp: new Date().toISOString(),
        submissionsCount: exportData.submissions.length,
        article: 'LGPD Art. 18, IV',
      },
    });

    return exportData;
  }

  /**
   * Excluir dados do usuário (LGPD Artigo 18, VI - Direito ao Apagamento)
   *
   * Executa hard delete de todas as submissões do usuário.
   * Esta operação é irreversível e atende ao direito de exclusão de dados.
   *
   * @param userId - ID do usuário
   * @param organizationId - ID da organização
   * @returns Resultado da operação
   */
  async deleteUserData(
    userId: string,
    organizationId: string,
  ): Promise<DeletionResult> {
    // 1. Verificar se o usuário existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // 2. Excluir todas as submissões (hard delete)
    await this.submissionRepository.deleteByUser(userId, organizationId);

    // 3. Registrar na trilha de auditoria
    // IMPORTANTE: O log de auditoria é essencial para comprovar conformidade
    await this.auditLogService.log({
      action: 'user_data_deleted',
      userId,
      organizationId,
      metadata: {
        timestamp: new Date().toISOString(),
        reason: 'LGPD_right_to_erasure',
        article: 'LGPD Art. 18, VI',
      },
    });

    return {
      success: true,
      message: 'Dados do usuário excluídos permanentemente',
      timestamp: new Date(),
    };
  }
}
