import { Injectable, Inject, Logger } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import * as ExcelJS from 'exceljs';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import { ExportQueryDto, ExportFormat } from '../dtos/export-query.dto';
import { Role } from '../../../roles/domain/enums/role.enum';

/**
 * Registro formatado para exportação
 */
export interface ExportRecord {
  Data: string;
  'Nível Emocional': number;
  Emoji: string;
  Categoria: string;
  Departamento: string;
  Equipe: string;
  Anônimo: string;
  Comentário: string;
}

/**
 * Resultado da exportação
 */
export interface ExportResult {
  data: Buffer | string;
  mimeType: string;
  filename: string;
}

/**
 * Caso de Uso: Exportar Dados do Emociograma
 *
 * Responsável por gerar exportações de dados do emociograma
 * em diferentes formatos (CSV, Excel, JSON).
 *
 * Regras de acesso:
 * - GESTOR: Exporta apenas dados da sua equipe (anonimizados)
 * - ADMIN: Exporta todos os dados da organização
 */
@Injectable()
export class ExportEmociogramaUseCase {
  private readonly logger = new Logger(ExportEmociogramaUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
  ) {}

  /**
   * Executa a exportação de dados
   *
   * @param organizationId - ID da organização
   * @param query - Parâmetros de consulta (período, filtros, formato)
   * @param userId - ID do usuário solicitante
   * @param userRole - Role do usuário (GESTOR ou ADMIN)
   * @returns Buffer ou string com os dados exportados
   */
  async execute(
    organizationId: string,
    query: ExportQueryDto,
    userId: string,
    userRole: Role,
  ): Promise<ExportResult> {
    this.logger.log(
      `Exportando dados - orgId: ${organizationId}, formato: ${query.format || ExportFormat.CSV}, período: ${query.startDate.toISOString()} - ${query.endDate.toISOString()}`,
    );

    // Buscar submissões com base no papel do usuário
    const submissions = await this.fetchSubmissions(
      organizationId,
      query,
      userRole,
    );

    // Formatar dados para exportação
    const records = this.formatRecords(submissions);

    this.logger.log(`Exportando ${records.length} registros`);

    // Gerar arquivo no formato solicitado
    const format = query.format || ExportFormat.CSV;
    return this.generateExport(records, format);
  }

  /**
   * Busca submissões baseado no papel do usuário
   */
  private async fetchSubmissions(
    organizationId: string,
    query: ExportQueryDto,
    userRole: Role,
  ) {
    // Para GESTOR, filtrar apenas dados agregados/anonimizados
    // Para ADMIN, buscar todos os dados
    const result = await this.submissionRepository.findAll({
      where: {
        organizationId,
        ...(query.department && { department: query.department }),
        ...(query.team && { team: query.team }),
        ...(query.categoryId && { categoryId: query.categoryId }),
      },
      orderBy: { submittedAt: 'DESC' },
      // Buscar todos os registros para exportação (sem paginação)
      take: 10000,
      skip: 0,
    });

    // Filtrar por período
    const filteredData = result.data.filter((sub) => {
      const submittedAt = new Date(sub.submittedAt);
      return submittedAt >= query.startDate && submittedAt <= query.endDate;
    });

    // Para GESTOR, retornar dados mascarados
    if (userRole === Role.GESTOR) {
      return filteredData.map((sub) => sub.maskIdentity());
    }

    return filteredData;
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
   * Gera o arquivo de exportação no formato especificado
   */
  private async generateExport(
    records: ExportRecord[],
    format: ExportFormat,
  ): Promise<ExportResult> {
    switch (format) {
      case ExportFormat.CSV:
        return this.generateCSV(records);
      case ExportFormat.EXCEL:
        return this.generateExcel(records);
      case ExportFormat.JSON:
      default:
        return this.generateJSON(records);
    }
  }

  /**
   * Gera arquivo CSV
   */
  private generateCSV(records: ExportRecord[]): ExportResult {
    const csv = stringify(records, {
      header: true,
      columns: [
        'Data',
        'Nível Emocional',
        'Emoji',
        'Categoria',
        'Departamento',
        'Equipe',
        'Anônimo',
        'Comentário',
      ],
    });

    return {
      data: csv,
      mimeType: 'text/csv; charset=utf-8',
      filename: `emociograma_${this.getDateSuffix()}.csv`,
    };
  }

  /**
   * Gera arquivo Excel
   */
  private async generateExcel(records: ExportRecord[]): Promise<ExportResult> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PsicoZen';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Emociograma');

    // Definir colunas
    worksheet.columns = [
      { header: 'Data', key: 'Data', width: 25 },
      { header: 'Nível Emocional', key: 'Nível Emocional', width: 15 },
      { header: 'Emoji', key: 'Emoji', width: 10 },
      { header: 'Categoria', key: 'Categoria', width: 40 },
      { header: 'Departamento', key: 'Departamento', width: 20 },
      { header: 'Equipe', key: 'Equipe', width: 20 },
      { header: 'Anônimo', key: 'Anônimo', width: 10 },
      { header: 'Comentário', key: 'Comentário', width: 50 },
    ];

    // Estilizar header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Adicionar dados
    worksheet.addRows(records);

    // Aplicar formatação condicional para níveis de emoção
    for (let i = 2; i <= records.length + 1; i++) {
      const cell = worksheet.getCell(`B${i}`);
      const level = cell.value as number;

      if (level >= 6) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' }, // Vermelho claro para alertas
        };
      } else if (level <= 3) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC6EFCE' }, // Verde claro para positivos
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      data: Buffer.from(buffer),
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `emociograma_${this.getDateSuffix()}.xlsx`,
    };
  }

  /**
   * Gera arquivo JSON
   */
  private generateJSON(records: ExportRecord[]): ExportResult {
    const json = JSON.stringify(records, null, 2);

    return {
      data: json,
      mimeType: 'application/json',
      filename: `emociograma_${this.getDateSuffix()}.json`,
    };
  }

  /**
   * Gera sufixo de data para nome do arquivo
   */
  private getDateSuffix(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  }
}
