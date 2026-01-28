import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import type {
  IExportService,
  ExportRecord,
  ExportResult,
} from '../../domain/services/export.service.interface';
import {
  EXPORT_SERVICE,
  ExportFormatType,
} from '../../domain/services/export.service.interface';
import { ExportQueryDto, ExportFormat } from '../dtos/export-query.dto';
import { Role } from '../../../roles/domain/enums/role.enum';

/**
 * Caso de Uso: Exportar Dados do Emociograma
 *
 * Responsável por orquestrar a exportação de dados do emociograma.
 * Delega a geração de arquivos para o serviço de exportação (infraestrutura),
 * seguindo o princípio de Inversão de Dependência.
 *
 * Regras de acesso:
 * - GESTOR: Exporta apenas dados da sua equipe (anonimizados)
 * - ADMIN: Exporta todos os dados da organização
 */
@Injectable()
export class ExportEmociogramaUseCase {
  private readonly logger = new Logger(ExportEmociogramaUseCase.name);

  /**
   * Tamanho do lote para processamento paginado
   * Evita carregar todos os registros em memória de uma vez
   */
  private readonly BATCH_SIZE = 1000;

  /**
   * Limite máximo de registros por exportação
   * Para volumes maiores, considerar exportação assíncrona
   */
  private readonly MAX_RECORDS = 50000;

  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
    @Inject(EXPORT_SERVICE)
    private readonly exportService: IExportService,
  ) {}

  /**
   * Executa a exportação de dados
   *
   * @param organizationId - ID da organização
   * @param query - Parâmetros de consulta (período, filtros, formato)
   * @param userId - ID do usuário solicitante
   * @param userRole - Role do usuário (GESTOR ou ADMIN)
   * @returns Resultado da exportação com dados, mime type e nome do arquivo
   */
  async execute(
    organizationId: string,
    query: ExportQueryDto,
    userId: string,
    userRole: Role,
  ): Promise<ExportResult> {
    const format = this.mapFormat(query.format);

    this.logger.log(
      `Exportando dados - orgId: ${organizationId}, formato: ${format}, período: ${query.startDate.toISOString()} - ${query.endDate.toISOString()}`,
    );

    // Buscar submissões com paginação para evitar sobrecarga de memória
    const records = await this.fetchAndFormatRecords(
      organizationId,
      query,
      userRole,
    );

    this.logger.log(`Exportando ${records.length} registros`);

    // Delegar geração do arquivo para o serviço de infraestrutura
    return this.exportService.generate(records, format);
  }

  /**
   * Busca e formata registros com paginação
   * Processa em lotes para evitar sobrecarga de memória
   */
  private async fetchAndFormatRecords(
    organizationId: string,
    query: ExportQueryDto,
    userRole: Role,
  ): Promise<ExportRecord[]> {
    const allRecords: ExportRecord[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && allRecords.length < this.MAX_RECORDS) {
      const result = await this.submissionRepository.findAll({
        where: {
          organizationId,
          ...(query.department && { department: query.department }),
          ...(query.team && { team: query.team }),
          ...(query.categoryId && { categoryId: query.categoryId }),
        },
        orderBy: { submittedAt: 'DESC' },
        take: this.BATCH_SIZE,
        skip: offset,
      });

      // Filtrar por período e formatar
      const filteredData = result.data.filter((sub) => {
        const submittedAt = new Date(sub.submittedAt);
        return submittedAt >= query.startDate && submittedAt <= query.endDate;
      });

      // Para GESTOR, mascarar identidades
      const processedData =
        userRole === Role.GESTOR
          ? filteredData.map((sub) => sub.maskIdentity())
          : filteredData;

      // Formatar registros
      const formattedRecords = this.formatRecords(processedData);
      allRecords.push(...formattedRecords);

      // Verificar se há mais dados
      hasMore = result.data.length === this.BATCH_SIZE;
      offset += this.BATCH_SIZE;
    }

    if (allRecords.length >= this.MAX_RECORDS) {
      this.logger.warn(
        `Exportação limitada a ${this.MAX_RECORDS} registros. Total disponível pode ser maior.`,
      );
    }

    return allRecords;
  }

  /**
   * Formata os dados para exportação
   */
  private formatRecords(
    submissions: Array<{
      submittedAt: Date;
      emotionLevel: number;
      emotionEmoji: string;
      categoryId: string;
      department?: string;
      team?: string;
      isAnonymous: boolean;
      comment?: string;
    }>,
  ): ExportRecord[] {
    return submissions.map((sub) => ({
      Data: sub.submittedAt.toISOString(),
      'Nível Emocional': sub.emotionLevel,
      Emoji: sub.emotionEmoji,
      Categoria: sub.categoryId,
      Departamento: sub.department || 'N/A',
      Equipe: sub.team || 'N/A',
      Anônimo: sub.isAnonymous ? 'Sim' : 'Não',
      Comentário: sub.comment || '',
    }));
  }

  /**
   * Mapeia formato do DTO para tipo de exportação do domínio
   */
  private mapFormat(format?: ExportFormat): ExportFormatType {
    switch (format) {
      case ExportFormat.EXCEL:
        return ExportFormatType.EXCEL;
      case ExportFormat.JSON:
        return ExportFormatType.JSON;
      case ExportFormat.CSV:
      default:
        return ExportFormatType.CSV;
    }
  }
}
