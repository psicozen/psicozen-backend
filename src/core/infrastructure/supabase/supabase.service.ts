import { Injectable, Scope, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService {
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    @Inject(REQUEST) private readonly request: Request,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_PUBLISHABLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and PUBLISHABLE_KEY must be defined');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Extrair token do header Authorization
    const token = this.extractTokenFromHeader(request);
    if (token) {
      this.supabase.auth.setSession({
        access_token: token,
        refresh_token: '',
      });
    }
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Auth methods
  async signInWithOtp(params: {
    email: string;
    options?: {
      emailRedirectTo?: string;
      shouldCreateUser?: boolean;
      data?: object;
    };
  }) {
    return this.supabase.auth.signInWithOtp(params);
  }

  async verifyOtp(params: {
    token_hash: string;
    type: 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change';
  }) {
    return this.supabase.auth.verifyOtp(params);
  }

  async getUser(token?: string) {
    return this.supabase.auth.getUser(token);
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  // Storage methods
  getStorage() {
    return this.supabase.storage;
  }

  // Database methods
  from(table: string) {
    return this.supabase.from(table);
  }
}
