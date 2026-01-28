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
 * Formatos de exportação suportados
 */
export enum ExportFormatType {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
}

/**
 * Interface do Serviço de Exportação
 *
 * Define o contrato para geração de arquivos de exportação.
 * Implementações concretas ficam na camada de infraestrutura.
 */
export interface IExportService {
  /**
   * Gera arquivo de exportação no formato especificado
   *
   * @param records - Registros a serem exportados
   * @param format - Formato de saída (CSV, Excel, JSON)
   * @returns Resultado da exportação com dados, mime type e nome do arquivo
   */
  generate(records: ExportRecord[], format: ExportFormatType): Promise<ExportResult>;

  /**
   * Verifica se o serviço suporta o formato especificado
   */
  supportsFormat(format: ExportFormatType): boolean;
}

/**
 * Token de injeção de dependência para o serviço de exportação
 */
export const EXPORT_SERVICE = Symbol('IExportService');
