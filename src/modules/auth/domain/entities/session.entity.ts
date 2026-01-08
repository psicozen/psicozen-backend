import { BaseEntity } from '../../../../core/domain/entities/base.entity';

export class SessionEntity extends BaseEntity {
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isValid: boolean;

  constructor(partial?: Partial<SessionEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  revoke(): void {
    this.isValid = false;
    this.touch();
  }

  static create(
    userId: string,
    refreshToken: string,
    expiresInSeconds: number,
    ipAddress?: string,
    userAgent?: string,
  ): SessionEntity {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

    return new SessionEntity({
      userId,
      refreshToken,
      expiresAt,
      ipAddress,
      userAgent,
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
