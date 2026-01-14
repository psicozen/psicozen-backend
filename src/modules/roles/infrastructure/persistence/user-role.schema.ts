import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserSchema } from '../../../users/infrastructure/persistence/user.schema';
import { RoleSchema } from './role.schema';
import { OrganizationSchema } from '../../../organizations/infrastructure/persistence/organization.schema';

/**
 * Schema de relacionamento entre usuários e papéis com contexto organizacional
 *
 * Relaciona usuários a papéis dentro de organizações específicas.
 * Papéis globais (como SUPER_ADMIN) têm organizationId = null.
 */
@Entity('user_roles')
@Index(['userId', 'roleId', 'organizationId'], { unique: true })
@Index(['organizationId'])
export class UserRoleSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'role_id' })
  roleId: string;

  @Column({ type: 'uuid', nullable: true, name: 'organization_id' })
  organizationId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'assigned_by' })
  assignedBy: string | null;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;

  @ManyToOne(() => UserSchema)
  @JoinColumn({ name: 'user_id' })
  user: UserSchema;

  @ManyToOne(() => RoleSchema)
  @JoinColumn({ name: 'role_id' })
  role: RoleSchema;

  @ManyToOne(() => OrganizationSchema, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationSchema;
}
