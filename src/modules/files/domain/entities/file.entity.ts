import { BaseEntity } from '../../../../core/domain/entities/base.entity';

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  [key: string]: unknown;
}

export class FileEntity extends BaseEntity {
  originalName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  url: string;
  isPublic: boolean;
  uploadedBy: string;
  metadata: FileMetadata;

  constructor(partial?: Partial<FileEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }

  static create(
    originalName: string,
    storagePath: string,
    mimeType: string,
    size: number,
    url: string,
    uploadedBy: string,
    isPublic: boolean = false,
  ): FileEntity {
    return new FileEntity({
      originalName,
      storagePath,
      mimeType,
      size,
      url,
      uploadedBy,
      isPublic,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
