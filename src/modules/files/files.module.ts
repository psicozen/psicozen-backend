import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileSchema } from './infrastructure/persistence/file.schema';
import { SupabaseStorageService } from './infrastructure/services/supabase-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([FileSchema])],
  controllers: [],
  providers: [SupabaseStorageService],
  exports: [SupabaseStorageService],
})
export class FilesModule {}
