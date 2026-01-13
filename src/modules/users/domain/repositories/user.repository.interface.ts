import { IBaseRepository } from '../../../../core/domain/repositories/base.repository.interface';
import { UserEntity } from '../entities/user.entity';

export interface IUserRepository extends IBaseRepository<UserEntity> {
  findByEmail(email: string): Promise<UserEntity | null>;
  findBySupabaseUserId(supabaseUserId: string): Promise<UserEntity | null>;
  existsByEmail(email: string): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
