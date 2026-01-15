import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../../core/infrastructure/supabase/supabase.service';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly supabaseService: SupabaseService) {}

  async execute(supabaseUserId: string): Promise<{ message: string }> {
    // Sign out from Supabase (revokes session on Supabase side)
    await this.supabaseService.signOut();

    return {
      message: 'Logged out successfully',
    };
  }
}
