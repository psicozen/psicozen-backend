import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../../core/infrastructure/supabase/supabase.service';

@Injectable()
export class SupabaseStorageService {
  private readonly bucketName = 'uploads';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async upload(
    filePath: string,
    buffer: Buffer,
    mimeType: string,
    isPublic: boolean = false,
  ): Promise<{ path: string; url: string }> {
    const { data, error } = await this.supabaseService.getStorage()
      .from(this.bucketName)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const url = isPublic
      ? this.getPublicUrl(data.path)
      : await this.getSignedUrl(data.path, 3600);

    return { path: data.path, url };
  }

  async delete(filePath: string): Promise<void> {
    const { error } = await this.supabaseService.getStorage()
      .from(this.bucketName)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  getPublicUrl(filePath: string): string {
    const { data } = this.supabaseService.getStorage()
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.supabaseService.getStorage()
      .from(this.bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }
}
