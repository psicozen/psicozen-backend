import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/infrastructure/supabase/supabase.service';
import { SendMagicLinkDto } from '../dtos/send-magic-link.dto';

@Injectable()
export class SendMagicLinkUseCase {
  constructor(private readonly supabaseService: SupabaseService) {}

  async execute(dto: SendMagicLinkDto): Promise<{ message: string }> {
    try {
      const { data, error } = await this.supabaseService.signInWithOtp({
        email: dto.email,
        options: {
          emailRedirectTo: dto.redirectTo,
          shouldCreateUser: true,
        },
      });

      if (error) {
        throw new BadRequestException(
          `Failed to send magic link: ${error.message}`,
        );
      }

      return {
        message: 'Magic link sent successfully. Please check your email.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to send magic link');
    }
  }
}
