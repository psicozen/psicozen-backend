import { Injectable, Inject, Logger } from '@nestjs/common';
import { NotFoundException } from '../../../../core/domain/exceptions';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { SupabaseAdminService } from '../../../../core/infrastructure/supabase/supabase-admin.service';

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly supabaseAdminService: SupabaseAdminService,
  ) {}

  async execute(id: string, hardDelete: boolean = false): Promise<void> {
    // Use findByIdWithDeleted to include soft-deleted users
    // This allows cleanup of Supabase Auth for users that were soft-deleted before
    const user = await this.userRepository.findByIdWithDeleted(id);

    if (!user) {
      throw new NotFoundException('User', id);
    }

    // Delete from Supabase Auth if user has supabaseUserId
    if (user.supabaseUserId) {
      try {
        await this.supabaseAdminService.deleteUser(user.supabaseUserId);
        this.logger.log(
          `User deleted from Supabase Auth: ${user.email} (${user.supabaseUserId})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to delete user from Supabase Auth: ${error}`,
        );
        // Continue with local deletion even if Supabase deletion fails
      }
    }

    // If user was already soft-deleted, do hard delete to clean up
    if (user.deletedAt) {
      await this.userRepository.delete(id);
      this.logger.log(`Hard deleted previously soft-deleted user: ${user.email}`);
    } else if (hardDelete) {
      await this.userRepository.delete(id);
    } else {
      await this.userRepository.softDelete(id);
    }
  }
}
