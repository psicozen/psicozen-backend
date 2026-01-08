import { FilesModule } from './files.module';
import { FileSchema } from './infrastructure/persistence/file.schema';
import { SupabaseStorageService } from './infrastructure/services/supabase-storage.service';

describe('FilesModule', () => {
  it('should be defined', () => {
    expect(FilesModule).toBeDefined();
  });

  it('should have file schema defined', () => {
    expect(FileSchema).toBeDefined();
  });

  it('should have SupabaseStorageService defined', () => {
    expect(SupabaseStorageService).toBeDefined();
  });
});
