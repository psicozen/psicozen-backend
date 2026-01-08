import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { FileMetadata } from '../../domain/entities/file.entity';

@Entity('files')
@Index(['uploadedBy'])
export class FileSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'storage_path', unique: true })
  storagePath: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: FileMetadata;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
