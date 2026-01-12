import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type {
  OrganizationSettings,
  OrganizationType,
} from '../../src/modules/organizations/domain/types/organization-settings.types';

@Entity('organizations')
export class TestOrganizationSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 50 })
  type: OrganizationType;

  @Column({ type: 'simple-json', default: '{}' })
  settings: OrganizationSettings;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @ManyToOne(() => TestOrganizationSchema, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: TestOrganizationSchema;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
