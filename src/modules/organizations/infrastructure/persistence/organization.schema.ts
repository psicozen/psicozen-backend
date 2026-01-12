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
import type { OrganizationSettings } from '../../domain/types/organization-settings.types';

@Entity('organizations')
@Index(['slug'], { unique: true })
@Index(['parentId'])
@Index(['isActive'], { where: 'deleted_at IS NULL' })
export class OrganizationSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'jsonb', default: {} })
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
