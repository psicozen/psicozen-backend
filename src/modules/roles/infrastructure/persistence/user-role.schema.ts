import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationSchema } from '../../../organizations/infrastructure/persistence/organization.schema';

@Entity('user_roles')
@Index(['userId', 'roleId', 'organizationId'], { unique: true })
@Index(['organizationId'])
export class UserRoleSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'role_id' })
  roleId: string;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string | null;

  @ManyToOne(() => OrganizationSchema, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationSchema;

  @Column({ name: 'assigned_by' })
  assignedBy: string;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
