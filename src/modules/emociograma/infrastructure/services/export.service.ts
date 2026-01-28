import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import * as ExcelJS from 'exceljs';
import type {
  IExportService,
  ExportRecord,
  ExportResult,
} from '../../domain/services/export.service.interface';
import { ExportFormatType } from '../../domain/services/export.service.interface';

/**
 * Serviço de Exportação - Implementação de Infraestrutura
 *
 * Responsável pela geração de arquivos de exportação em diferentes formatos.
 * Isola as dependências de bibliotecas externas (csv-stringify, exceljs)
 * na camada de infraestrutura, seguindo Clean Architecture.
 */
@Injectable()
export class ExportService implements IExportService {
  /**
   * Gera arquivo de exportação no formato especificado
   */
  async generate(
    records: ExportRecord[],
    format: ExportFormatType,
  ): Promise<ExportResult> {
    switch (format) {
      case ExportFormatType.CSV:
        return this.generateCSV(records);
      case ExportFormatType.EXCEL:
        return this.generateExcel(records);
      case ExportFormatType.JSON:
      default:
        return this.generateJSON(records);
    }
  }

  /**
   * Verifica se o serviço suporta o formato especificado
   */
  supportsFormat(format: ExportFormatType): boolean {
    return Object.values(ExportFormatType).includes(format);
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
   * Gera arquivo Excel com formatação
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
