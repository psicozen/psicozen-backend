import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { TypeOrmBaseRepository } from '../../../../core/infrastructure/repositories/typeorm-base.repository';
import { SessionEntity } from '../../domain/entities/session.entity';
import { SessionSchema } from '../persistence/session.schema';
import { ISessionRepository } from '../../domain/repositories/session.repository.interface';

@Injectable()
export class SessionRepository
  extends TypeOrmBaseRepository<SessionSchema, SessionEntity>
  implements ISessionRepository
{
  constructor(
    @InjectRepository(SessionSchema)
    repository: Repository<SessionSchema>,
  ) {
    super(repository);
  }

  toDomain(schema: SessionSchema): SessionEntity {
    return new SessionEntity({
      id: schema.id,
      userId: schema.userId,
      refreshToken: schema.refreshToken,
      expiresAt: schema.expiresAt,
      ipAddress: schema.ipAddress,
      userAgent: schema.userAgent,
      isValid: schema.isValid,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    });
  }

  toEntity(domain: Partial<SessionEntity>): SessionSchema {
    const schema = new SessionSchema();
    if (domain.id) schema.id = domain.id;
    schema.userId = domain.userId!;
    schema.refreshToken = domain.refreshToken!;
    schema.expiresAt = domain.expiresAt!;
    schema.ipAddress = domain.ipAddress;
    schema.userAgent = domain.userAgent;
    schema.isValid = domain.isValid ?? true;
    return schema;
  }

  async findByToken(token: string): Promise<SessionEntity | null> {
    const schema = await this.repository.findOne({
      where: { refreshToken: token },
    });
    return schema ? this.toDomain(schema) : null;
  }

  async findActiveByUserId(userId: string): Promise<SessionEntity[]> {
    const schemas = await this.repository.find({
      where: { userId, isValid: true },
      order: { createdAt: 'DESC' },
    });
    return schemas.map((s) => this.toDomain(s));
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.repository.update({ userId }, { isValid: false });
  }

  async revokeByToken(token: string): Promise<void> {
    await this.repository.update({ refreshToken: token }, { isValid: false });
  }

  async deleteExpired(): Promise<void> {
    await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
