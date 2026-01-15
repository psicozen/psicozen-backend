import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  IAuthService,
  AuthenticatedUser,
} from '../../domain/services/auth.service.interface';

/**
 * SupabaseAuthService
 *
 * Implementação concreta de IAuthService usando Supabase Auth SDK.
 * Camada de Infrastructure - encapsula toda interação com Supabase.
 *
 * Responsabilidades:
 * - Validar tokens de acesso com Supabase Auth
 * - Realizar logout/revogação de sessão
 * - Mapear dados do Supabase User para AuthenticatedUser
 *
 * Notas:
 * - Singleton scope (default) - reutiliza client Supabase
 * - Não mantém sessão (persistSession: false)
 */
@Injectable()
export class SupabaseAuthService implements IAuthService {
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_PUBLISHABLE_KEY',
    );

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and PUBLISHABLE_KEY must be defined');
    }

    // Inicializa client Supabase sem persistência de sessão
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * Valida token com Supabase Auth e retorna dados do usuário
   *
   * @param token - Bearer token de autenticação
   * @returns Dados do usuário ou null se token inválido
   */
  async validateToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        return null;
      }

      const supabaseUser = data.user;

      // Mapear Supabase User para AuthenticatedUser
      return {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        firstName:
          (supabaseUser.user_metadata?.first_name as string | undefined) ||
          (supabaseUser.user_metadata?.firstName as string | undefined),
        lastName:
          (supabaseUser.user_metadata?.last_name as string | undefined) ||
          (supabaseUser.user_metadata?.lastName as string | undefined),
        metadata: supabaseUser.user_metadata as Record<string, any>,
      };
    } catch (error) {
      // Log error para debugging (considere usar logger em produção)
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Realiza logout na sessão Supabase
   */
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}
