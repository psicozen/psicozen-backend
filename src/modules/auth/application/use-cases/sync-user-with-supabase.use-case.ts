import { Injectable, Inject } from '@nestjs/common';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import type { AuthenticatedUser } from '../../domain/services/auth.service.interface';

/**
 * SyncUserWithSupabaseUseCase
 *
 * Encapsula a lógica de negócio para sincronizar usuários autenticados
 * com o banco de dados local.
 *
 * Responsabilidades:
 * - Buscar usuário por Supabase User ID
 * - Criar usuário local automaticamente na primeira autenticação
 * - Atualizar timestamp de último login
 *
 * Regras de negócio:
 * - Auto-criação de usuário é transparente ao usuário final
 * - Último login sempre atualizado em cada autenticação
 */
@Injectable()
export class SyncUserWithSupabaseUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Sincroniza usuário autenticado do Supabase com banco local
   *
   * @param authenticatedUser - Dados do usuário retornados pelo provedor de auth
   * @returns Entidade do usuário local sincronizada
   */
  async execute(authenticatedUser: AuthenticatedUser): Promise<UserEntity> {
    // Buscar usuário por Supabase User ID
    let user = await this.userRepository.findBySupabaseUserId(
      authenticatedUser.id,
    );

    if (!user) {
      // Auto-criar usuário na primeira autenticação
      user = await this.userRepository.create(
        UserEntity.create(
          authenticatedUser.email,
          authenticatedUser.id,
          authenticatedUser.firstName ||
            (authenticatedUser.metadata?.first_name as string | undefined) ||
            (authenticatedUser.metadata?.firstName as string | undefined),
        ),
      );
    } else {
      // Atualizar último login
      user.recordLogin();
      await this.userRepository.update(user.id, user);
    }

    return user;
  }
}
