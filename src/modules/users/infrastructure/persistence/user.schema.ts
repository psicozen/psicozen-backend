import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import type { UserPreferences } from '../../domain/entities/user.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['supabaseUserId'], {
  unique: true,
  where: 'supabase_user_id IS NOT NULL',
})
export class UserSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'first_name', nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', nullable: true })
  lastName?: string;

  @Column({ name: 'photo_url', nullable: true })
  photoUrl?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'jsonb', default: {} })
  preferences: UserPreferences;

  @Column({ name: 'supabase_user_id', unique: true, nullable: true })
  supabaseUserId?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
