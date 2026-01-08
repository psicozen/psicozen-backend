import { IBaseRepository } from '../../../../core/domain/repositories/base.repository.interface';
import { SessionEntity } from '../entities/session.entity';

export interface ISessionRepository extends IBaseRepository<SessionEntity> {
  findByToken(token: string): Promise<SessionEntity | null>;
  findActiveByUserId(userId: string): Promise<SessionEntity[]>;
  revokeAllByUserId(userId: string): Promise<void>;
  revokeByToken(token: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

export const SESSION_REPOSITORY = Symbol('ISessionRepository');
