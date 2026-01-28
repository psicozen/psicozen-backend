import { ExportService } from './export.service';
import type { ExportRecord } from '../../domain/services/export.service.interface';
import { ExportFormatType } from '../../domain/services/export.service.interface';

describe('ExportService', () => {
  let service: ExportService;

  const mockRecords: ExportRecord[] = [
    {
      Data: '2024-01-15T10:00:00.000Z',
      'Nível Emocional': 3,
      Emoji: '😊',
      Categoria: 'cat-001',
      Departamento: 'Engineering',
      Equipe: 'Backend',
      Anônimo: 'Não',
      Comentário: 'Feeling good',
    },
    {
      Data: '2024-01-16T10:00:00.000Z',
      'Nível Emocional': 7,
      Emoji: '😢',
      Categoria: 'cat-002',
      Departamento: 'N/A',
      Equipe: 'N/A',
      Anônimo: 'Sim',
      Comentário: '',
    },
  ];

  beforeEach(() => {
    service = new ExportService();
  });

  describe('generate', () => {
    describe('CSV format', () => {
      it('deve gerar CSV com headers corretos', async () => {
        const result = await service.generate(mockRecords, ExportFormatType.CSV);

        expect(result.mimeType).toBe('text/csv; charset=utf-8');
        expect(result.filename).toMatch(/^emociograma_\d{8}\.csv$/);
        expect(typeof result.data).toBe('string');

        const csv = result.data as string;
        const firstLine = csv.split('\n')[0];
        expect(firstLine).toContain('Data');
        expect(firstLine).toContain('Nível Emocional');
        expect(firstLine).toContain('Emoji');
      });

      it('deve incluir dados dos registros', async () => {
        const result = await service.generate(mockRecords, ExportFormatType.CSV);

        const csv = result.data as string;
        expect(csv).toContain('2024-01-15');
        expect(csv).toContain('Engineering');
        expect(csv).toContain('Backend');
      });

      it('deve ter número correto de linhas', async () => {
        const result = await service.generate(mockRecords, ExportFormatType.CSV);

        const csv = result.data as string;
        const lines = csv.trim().split('\n');

        // 1 header + 2 data lines
        expect(lines.length).toBe(3);
      });

      it('deve gerar CSV vazio com apenas headers', async () => {
        const result = await service.generate([], ExportFormatType.CSV);

        const csv = result.data as string;
        const lines = csv.trim().split('\n');

        expect(lines.length).toBe(1); // Apenas header
      });
    });

    describe('Excel format', () => {
      it('deve gerar Excel como Buffer', async () => {
        const result = await service.generate(mockRecords, ExportFormatType.EXCEL);

        expect(result.mimeType).toBe(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        expect(result.filename).toMatch(/^emociograma_\d{8}\.xlsx$/);
        expect(Buffer.isBuffer(result.data)).toBe(true);
      });

      it('deve gerar arquivo Excel válido', async () => {
        const result = await service.generate(mockRecords, ExportFormatType.EXCEL);

        expect((result.data as Buffer).length).toBeGreaterThan(0);
      });

      it('deve gerar Excel vazio válido', async () => {
        const result = await service.generate([], ExportFormatType.EXCEL);

        expect(Buffer.isBuffer(result.data)).toBe(true);
        expect((result.data as Buffer).length).toBeGreaterThan(0);
      });
    });

    describe('JSON format', () => {
      it('deve gerar JSON válido', async () => {
        const result = await service.generate(mockRecords, ExportFormatType.JSON);

        expect(result.mimeType).toBe('application/json');
        expect(result.filename).toMatch(/^emociograma_\d{8}\.json$/);
        expect(typeof result.data).toBe('string');

        const parsed = JSON.parse(result.data as string);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(2);
      });

      it('deve preservar estrutura dos registros', async () => {
        const result = await service.generate(mockRecords, ExportFormatType.JSON);

        const parsed = JSON.parse(result.data as string);
        const record = parsed[0];

        expect(record.Data).toBe('2024-01-15T10:00:00.000Z');
        expect(record['Nível Emocional']).toBe(3);
        expect(record.Emoji).toBe('😊');
        expect(record.Departamento).toBe('Engineering');
      });

      it('deve gerar array vazio para registros vazios', async () => {
        const result = await service.generate([], ExportFormatType.JSON);

        const parsed = JSON.parse(result.data as string);
        expect(parsed).toEqual([]);
      });
    });
  });

  describe('supportsFormat', () => {
    it('deve suportar formato CSV', () => {
      expect(service.supportsFormat(ExportFormatType.CSV)).toBe(true);
    });

    it('deve suportar formato Excel', () => {
      expect(service.supportsFormat(ExportFormatType.EXCEL)).toBe(true);
    });

    it('deve suportar formato JSON', () => {
      expect(service.supportsFormat(ExportFormatType.JSON)).toBe(true);
    });

    it('deve rejeitar formato inválido', () => {
      expect(service.supportsFormat('invalid' as ExportFormatType)).toBe(false);
    });
  });

  describe('nome do arquivo', () => {
    it('deve gerar nome com data atual para CSV', async () => {
      const result = await service.generate([], ExportFormatType.CSV);

      const today = new Date();
      const expectedPattern = `emociograma_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.csv`;

      expect(result.filename).toBe(expectedPattern);
    });

    it('deve gerar nome com data atual para Excel', async () => {
      const result = await service.generate([], ExportFormatType.EXCEL);

      const today = new Date();
      const expectedPattern = `emociograma_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;

      expect(result.filename).toBe(expectedPattern);
    });

    it('deve gerar nome com data atual para JSON', async () => {
      const result = await service.generate([], ExportFormatType.JSON);

      const today = new Date();
      const expectedPattern = `emociograma_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.json`;

      expect(result.filename).toBe(expectedPattern);
    });
  });
});
