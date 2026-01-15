import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../../core/presentation/decorators/public.decorator';
import type { IAuthService } from '../../domain/services/auth.service.interface';
import { AUTH_SERVICE } from '../../domain/services/auth.service.interface';
import { SyncUserWithSupabaseUseCase } from '../../application/use-cases/sync-user-with-supabase.use-case';

/**
 * SupabaseAuthGuard
 *
 * Guard global de autenticação para rotas protegidas.
 * Camada de Presentation - responsável apenas por autorização.
 *
 * Responsabilidades:
 * - Verificar se rota é pública (@Public decorator)
 * - Extrair e validar token de autenticação (delega para IAuthService)
 * - Sincronizar usuário com banco local (delega para Use Case)
 * - Verificar se conta está ativa
 * - Anexar dados do usuário ao request para @CurrentUser decorator
 *
 * Clean Architecture:
 * - Depende de IAuthService (abstração), não de implementação concreta
 * - Delega lógica de negócio para Use Cases
 * - Mantém apenas lógica de autorização HTTP
 */
@Injectable()
export class SupabaseAuthGuard {
  constructor(
    private reflector: Reflector,
    @Inject(AUTH_SERVICE)
    private readonly authService: IAuthService,
    private readonly syncUserUseCase: SyncUserWithSupabaseUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Verificar se rota é pública (@Public decorator)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<any>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      // 2. Validar token com serviço de autenticação (delega para IAuthService)
      const authenticatedUser = await this.authService.validateToken(token);

      if (!authenticatedUser) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // 3. Sincronizar usuário com banco local (delega para Use Case)
      const user = await this.syncUserUseCase.execute(authenticatedUser);

      // 4. Verificar se conta está ativa (autorização)
      if (!user.isActive) {
        throw new UnauthorizedException('User account is disabled');
      }

      // 5. Anexar dados do usuário ao request para @CurrentUser decorator
      request.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        supabaseUserId: user.supabaseUserId,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
