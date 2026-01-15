import { Injectable, Inject } from '@nestjs/common';
import type { IAuthService } from '../../domain/services/auth.service.interface';
import { AUTH_SERVICE } from '../../domain/services/auth.service.interface';

/**
 * LogoutUseCase
 *
 * Encapsula a lógica de negócio para realizar logout.
 * Camada de Application - depende de abstração IAuthService.
 *
 * Responsabilidades:
 * - Revogar sessão no provedor de autenticação (delega para IAuthService)
 * - Retornar mensagem de sucesso
 *
 * Clean Architecture:
 * - Depende de IAuthService (abstração), não de SupabaseService (implementação)
 * - Não conhece detalhes de infraestrutura (Supabase, Auth0, etc.)
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authService: IAuthService,
  ) {}

  async execute(_supabaseUserId: string): Promise<{ message: string }> {
    // Revogar sessão no provedor de autenticação
    await this.authService.signOut();

    return {
      message: 'Logged out successfully',
    };
  }
}
