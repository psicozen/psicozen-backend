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
import type {
  OrganizationSettings,
  OrganizationType,
} from '../../domain/types/organization-settings.types';

const isTestEnvironment = process.env.NODE_ENV === 'test';

@Entity('organizations')
@Index(['slug'], { unique: true })
@Index(['parentId'])
@Index(['isActive'], { where: 'deleted_at IS NULL' })
export class OrganizationSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 50 })
  type: OrganizationType;

  @Column({
    type: isTestEnvironment ? 'simple-json' : 'jsonb',
    default: isTestEnvironment ? '{}' : {},
  })
  settings: OrganizationSettings;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @ManyToOne(() => OrganizationSchema, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: OrganizationSchema;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
