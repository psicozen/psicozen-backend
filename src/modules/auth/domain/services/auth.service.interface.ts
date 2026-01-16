/**
 * Auth Service Interface
 *
 * Abstração para serviços de autenticação (Supabase, Auth0, etc.)
 * Seguindo Clean Architecture: Application Layer depende desta interface,
 * não da implementação concreta.
 */
export interface IAuthService {
  /**
   * Valida um token de acesso e retorna dados do usuário autenticado
   * @param token - Bearer token de autenticação
   * @returns Dados do usuário autenticado ou null se inválido
   */
  validateToken(token: string): Promise<AuthenticatedUser | null>;

  /**
   * Realiza logout/revogação de sessão
   * @returns Resultado da operação de logout
   */
  signOut(): Promise<void>;
}

/**
 * Dados do usuário autenticado retornados pelo serviço de auth
 */
export interface AuthenticatedUser {
  id: string; // ID do usuário no provedor de auth (e.g., Supabase User ID)
  email: string;
  firstName?: string;
  lastName?: string;
  metadata?: Record<string, any>;
}

/**
 * Símbolo de injeção para IAuthService
 */
export const AUTH_SERVICE = Symbol('IAuthService');
