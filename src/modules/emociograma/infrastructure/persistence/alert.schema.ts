import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationSchema } from '../../../organizations/infrastructure/persistence/organization.schema';
import { UserSchema } from '../../../users/infrastructure/persistence/user.schema';
import { EmociogramaSubmissionSchema } from './submission.schema';

/**
 * Schema TypeORM para a tabela emociograma_alerts
 *
 * Representa um alerta gerado automaticamente quando uma submissão
 * atinge níveis emocionais preocupantes (>= 6) ou quando padrões
 * negativos são detectados ao longo do tempo.
 *
 * Índices otimizados para:
 * - Consultas por organização
 * - Lookup por submissão
 * - Filtro por severidade
 * - Ordenação cronológica
 * - Alertas não resolvidos (índice parcial no banco)
 */
@Entity('emociograma_alerts')
@Index('idx_alerts_organization', ['organizationId'])
@Index('idx_alerts_submission', ['submissionId'])
@Index('idx_alerts_severity', ['organizationId', 'severity'])
@Index('idx_alerts_created', ['organizationId', 'createdAt'])
export class EmociogramaAlertSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'submission_id' })
  submissionId: string;

  @Column({ type: 'varchar', length: 50, name: 'alert_type' })
  alertType: string;

  @Column({ type: 'varchar', length: 20 })
  severity: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', name: 'is_resolved', default: false })
  isResolved: boolean;

  @Column({ type: 'timestamp', name: 'resolved_at', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'uuid', name: 'resolved_by', nullable: true })
  resolvedBy: string | null;

  @Column({ type: 'text', name: 'resolution_notes', nullable: true })
  resolutionNotes: string | null;

  @Column({ type: 'uuid', name: 'notified_users', array: true, nullable: true })
  notifiedUsers: string[] | null;

  @Column({ type: 'timestamp', name: 'notification_sent_at', nullable: true })
  notificationSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relações
  @ManyToOne(() => OrganizationSchema, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationSchema;

  @ManyToOne(() => EmociogramaSubmissionSchema, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission: EmociogramaSubmissionSchema;

  @ManyToOne(() => UserSchema, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolvedByUser: UserSchema;
}
