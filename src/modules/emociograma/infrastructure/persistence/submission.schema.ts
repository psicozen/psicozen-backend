import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationSchema } from '../../../organizations/infrastructure/persistence/organization.schema';
import { UserSchema } from '../../../users/infrastructure/persistence/user.schema';
import { EmociogramaCategorySchema } from './category.schema';

/**
 * TypeORM Schema - Emociograma Submission
 *
 * Maps to the `emociograma_submissions` table.
 * Stores individual emotional state submissions from users.
 *
 * Emotion Scale:
 * - 1-5: Positive emotions (very happy to neutral)
 * - 6-10: Negative emotions (tired to very sad) - triggers alert
 */
@Entity('emociograma_submissions')
@Index('idx_emociograma_org_user', ['organizationId', 'userId'])
@Index('idx_emociograma_org_date', ['organizationId', 'submittedAt'])
@Index('idx_emociograma_emotion_level', ['emotionLevel'])
@Index('idx_emociograma_category', ['categoryId'])
@Index('idx_emociograma_anonymous', ['isAnonymous'])
@Index('idx_emociograma_department', ['organizationId', 'department'])
@Index('idx_emociograma_team', ['organizationId', 'team'])
export class EmociogramaSubmissionSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'integer', name: 'emotion_level' })
  emotionLevel: number;

  @Column({ type: 'varchar', length: 10, name: 'emotion_emoji' })
  emotionEmoji: string;

  @Column({ type: 'uuid', name: 'category_id' })
  categoryId: string;

  @Column({ type: 'boolean', name: 'is_anonymous', default: false })
  isAnonymous: boolean;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'boolean', name: 'comment_flagged', default: false })
  commentFlagged: boolean;

  @Column({
    type: 'timestamp',
    name: 'submitted_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  submittedAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  team: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  // Relationships

  @ManyToOne(() => OrganizationSchema, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationSchema;

  @ManyToOne(() => UserSchema, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserSchema;

  @ManyToOne(() => EmociogramaCategorySchema, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: EmociogramaCategorySchema;
}
