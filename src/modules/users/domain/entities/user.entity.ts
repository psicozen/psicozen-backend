import { BaseEntity } from '../../../../core/domain/entities/base.entity';

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  timezone: string;
}

export class UserEntity extends BaseEntity {
  email: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  bio?: string;
  preferences: UserPreferences;
  supabaseUserId?: string;
  isActive: boolean;
  lastLoginAt?: Date;

  constructor(partial?: Partial<UserEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }

  static create(
    email: string,
    supabaseUserId?: string,
    firstName?: string,
  ): UserEntity {
    return new UserEntity({
      email,
      supabaseUserId,
      firstName,
      preferences: {
        language: 'en',
        theme: 'system',
        notifications: true,
        timezone: 'UTC',
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  updateProfile(data: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    photoUrl?: string;
  }): void {
    Object.assign(this, data);
    this.touch();
  }

  updatePreferences(preferences: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.touch();
  }

  recordLogin(): void {
    this.lastLoginAt = new Date();
    this.touch();
  }

  deactivate(): void {
    this.isActive = false;
    this.touch();
  }

  activate(): void {
    this.isActive = true;
    this.touch();
  }
}
