import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

/**
 * Schema TypeORM para a tabela audit_logs
 *
 * Mapeia a entidade de domínio AuditLogEntity para o banco de dados.
 * Registros são imutáveis após criação (apenas INSERT, sem UPDATE).
 */
@Entity('audit_logs')
@Index('IDX_audit_logs_user_org_created', [
  'userId',
  'organizationId',
  'createdAt',
])
export class AuditLogSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index('IDX_audit_logs_action')
  action: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('IDX_audit_logs_user_id')
  userId: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  @Index('IDX_audit_logs_organization_id')
  organizationId: string | null;

  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedBy: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index('IDX_audit_logs_created_at')
  createdAt: Date;
}
