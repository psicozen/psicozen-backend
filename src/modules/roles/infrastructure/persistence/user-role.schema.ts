import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_roles')
@Index(['userId', 'roleId'], { unique: true })
export class UserRoleSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'role_id' })
  roleId: string;

  @Column({ name: 'assigned_by' })
  assignedBy: string;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
