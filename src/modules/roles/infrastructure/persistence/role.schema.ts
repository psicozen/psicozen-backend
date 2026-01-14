import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { PermissionSchema } from './permission.schema';
import { OrganizationSchema } from '../../../organizations/infrastructure/persistence/organization.schema';

@Entity('roles')
@Index(['organizationId'])
@Index(['hierarchyLevel'])
export class RoleSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true, name: 'organization_id' })
  organizationId: string | null;

  @Column({ type: 'integer', default: 100, name: 'hierarchy_level' })
  hierarchyLevel: number;

  @Column({ type: 'boolean', default: false, name: 'is_system_role' })
  isSystemRole: boolean;

  @ManyToOne(() => OrganizationSchema, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationSchema;

  @ManyToMany(() => PermissionSchema)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: PermissionSchema[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
