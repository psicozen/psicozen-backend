import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface CreateSupabaseUserDto {
  email: string;
  password?: string;
  emailConfirm?: boolean;
  userData?: {
    firstName?: string;
    lastName?: string;
  };
}

export interface SupabaseUserResponse {
  id: string;
  email: string;
}

@Injectable()
export class SupabaseAdminService {
  private readonly adminClient: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseSecretKey = this.configService.get<string>(
      'SUPABASE_SECRET_KEY',
    );

    if (!supabaseUrl || !supabaseSecretKey) {
      throw new Error('Supabase URL and SECRET_KEY must be defined');
    }

    this.adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * Creates a new user in Supabase Auth using Admin API
   * This sends a confirmation email to the user
   */
  async createUser(dto: CreateSupabaseUserDto): Promise<SupabaseUserResponse> {
    const { data, error } = await this.adminClient.auth.admin.createUser({
      email: dto.email,
      email_confirm: dto.emailConfirm ?? false,
      user_metadata: dto.userData,
    });

    if (error) {
      throw new Error(`Failed to create Supabase user: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Failed to create Supabase user: No user returned');
    }

    return {
      id: data.user.id,
      email: data.user.email!,
    };
  }

  /**
   * Invites a user by email - sends magic link for first login
   */
  async inviteUserByEmail(email: string): Promise<SupabaseUserResponse> {
    const { data, error } = await this.adminClient.auth.admin.inviteUserByEmail(
      email,
    );

    if (error) {
      throw new Error(`Failed to invite user: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Failed to invite user: No user returned');
    }

    return {
      id: data.user.id,
      email: data.user.email!,
    };
  }

  /**
   * Deletes a user from Supabase Auth
   */
  async deleteUser(supabaseUserId: string): Promise<void> {
    const { error } = await this.adminClient.auth.admin.deleteUser(
      supabaseUserId,
    );

    if (error) {
      throw new Error(`Failed to delete Supabase user: ${error.message}`);
    }
  }

  /**
   * Gets a user by ID from Supabase Auth
   */
  async getUserById(supabaseUserId: string): Promise<SupabaseUserResponse | null> {
    const { data, error } = await this.adminClient.auth.admin.getUserById(
      supabaseUserId,
    );

    if (error) {
      return null;
    }

    if (!data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email!,
    };
  }
}
