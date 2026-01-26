import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migração: Criação da Tabela de Alertas do Emociograma
 *
 * Esta migração cria a tabela `emociograma_alerts` para armazenar
 * alertas gerados automaticamente quando submissões atingem níveis
 * de emoção preocupantes (>= 6) ou quando padrões são detectados.
 *
 * Inclui:
 * - Tabela com campos de alerta, resolução e notificação
 * - Índices de performance para consultas frequentes
 * - Índice parcial para alertas não resolvidos
 * - Políticas RLS (Row Level Security) para segurança multi-tenant
 * - Foreign keys para organizations, submissions e users
 */
export class CreateEmociogramaAlertsTable1768107300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // PARTE 1: CRIAÇÃO DA TABELA DE ALERTAS
    // ============================================================

    await queryRunner.createTable(
      new Table({
        name: 'emociograma_alerts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
            comment: 'Organização à qual o alerta pertence',
          },
          {
            name: 'submission_id',
            type: 'uuid',
            isNullable: false,
            comment: 'Submissão que gerou o alerta',
          },
          {
            name: 'alert_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: 'Tipo do alerta: threshold_exceeded, pattern_detected',
          },
          {
            name: 'severity',
            type: 'varchar',
            length: '20',
            isNullable: false,
            comment: 'Severidade: low, medium, high, critical',
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
            comment: 'Descrição detalhada do alerta',
          },
          {
            name: 'is_resolved',
            type: 'boolean',
            default: false,
            comment: 'Indica se o alerta foi tratado/resolvido',
          },
          {
            name: 'resolved_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Data/hora da resolução do alerta',
          },
          {
            name: 'resolved_by',
            type: 'uuid',
            isNullable: true,
            comment: 'Usuário que resolveu o alerta',
          },
          {
            name: 'resolution_notes',
            type: 'text',
            isNullable: true,
            comment: 'Notas sobre a resolução do alerta',
          },
          {
            name: 'notified_users',
            type: 'uuid',
            isArray: true,
            isNullable: true,
            comment: 'Array de IDs de usuários que foram notificados',
          },
          {
            name: 'notification_sent_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Data/hora do envio das notificações',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // ============================================================
    // PARTE 2: CONSTRAINTS DE VERIFICAÇÃO
    // ============================================================

    // Constraint para alert_type
    await queryRunner.query(`
      ALTER TABLE emociograma_alerts
      ADD CONSTRAINT CHK_emociograma_alerts_type
      CHECK (alert_type IN ('threshold_exceeded', 'pattern_detected'))
    `);

    // Constraint para severity
    await queryRunner.query(`
      ALTER TABLE emociograma_alerts
      ADD CONSTRAINT CHK_emociograma_alerts_severity
      CHECK (severity IN ('low', 'medium', 'high', 'critical'))
    `);

    // ============================================================
    // PARTE 3: CHAVES ESTRANGEIRAS
    // ============================================================

    // FK: organization_id -> organizations(id)
    await queryRunner.createForeignKey(
      'emociograma_alerts',
      new TableForeignKey({
        name: 'FK_emociograma_alerts_organization',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK: submission_id -> emociograma_submissions(id)
    await queryRunner.createForeignKey(
      'emociograma_alerts',
      new TableForeignKey({
        name: 'FK_emociograma_alerts_submission',
        columnNames: ['submission_id'],
        referencedTableName: 'emociograma_submissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK: resolved_by -> users(id)
    await queryRunner.createForeignKey(
      'emociograma_alerts',
      new TableForeignKey({
        name: 'FK_emociograma_alerts_resolved_by',
        columnNames: ['resolved_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // ============================================================
    // PARTE 4: ÍNDICES DE PERFORMANCE
    // ============================================================

    // Índice: organization_id (consultas por organização)
    await queryRunner.createIndex(
      'emociograma_alerts',
      new TableIndex({
        name: 'idx_alerts_organization',
        columnNames: ['organization_id'],
      }),
    );

    // Índice: submission_id (lookup por submissão)
    await queryRunner.createIndex(
      'emociograma_alerts',
      new TableIndex({
        name: 'idx_alerts_submission',
        columnNames: ['submission_id'],
      }),
    );

    // Índice composto: organização + severidade (filtrar por severidade)
    await queryRunner.createIndex(
      'emociograma_alerts',
      new TableIndex({
        name: 'idx_alerts_severity',
        columnNames: ['organization_id', 'severity'],
      }),
    );

    // Índice composto: organização + data de criação (ordenação cronológica)
    await queryRunner.createIndex(
      'emociograma_alerts',
      new TableIndex({
        name: 'idx_alerts_created',
        columnNames: ['organization_id', 'created_at'],
      }),
    );

    // Índice parcial: apenas alertas não resolvidos (otimização crítica)
    await queryRunner.query(`
      CREATE INDEX idx_alerts_unresolved
      ON emociograma_alerts(organization_id, is_resolved)
      WHERE is_resolved = false
    `);

    // ============================================================
    // PARTE 5: ROW LEVEL SECURITY (RLS)
    // ============================================================

    await queryRunner.query(`
      ALTER TABLE emociograma_alerts ENABLE ROW LEVEL SECURITY
    `);

    // Política SELECT: usuário vê alertas onde foi notificado
    await queryRunner.query(`
      CREATE POLICY emociograma_alerts_select_notified_policy
      ON emociograma_alerts
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND u.id = ANY(emociograma_alerts.notified_users)
        )
      )
    `);

    // Política SELECT: admin da organização vê todos os alertas da org
    await queryRunner.query(`
      CREATE POLICY emociograma_alerts_select_org_admin_policy
      ON emociograma_alerts
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND (
              public.user_has_role(u.id, 'admin', emociograma_alerts.organization_id)
              OR public.user_has_role(u.id, 'super_admin', NULL::uuid)
            )
        )
      )
    `);

    // Política INSERT: apenas admin pode criar alertas manualmente
    // (alertas são normalmente criados pelo sistema via service role)
    await queryRunner.query(`
      CREATE POLICY emociograma_alerts_insert_policy
      ON emociograma_alerts
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND (
              public.user_has_role(u.id, 'admin', emociograma_alerts.organization_id)
              OR public.user_has_role(u.id, 'super_admin', NULL::uuid)
            )
        )
      )
    `);

    // Política UPDATE: admin pode atualizar (resolver) alertas
    await queryRunner.query(`
      CREATE POLICY emociograma_alerts_update_policy
      ON emociograma_alerts
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND (
              public.user_has_role(u.id, 'admin', emociograma_alerts.organization_id)
              OR public.user_has_role(u.id, 'super_admin', NULL::uuid)
            )
        )
      )
    `);

    // Política DELETE: apenas admin pode deletar alertas
    await queryRunner.query(`
      CREATE POLICY emociograma_alerts_delete_policy
      ON emociograma_alerts
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND (
              public.user_has_role(u.id, 'admin', emociograma_alerts.organization_id)
              OR public.user_has_role(u.id, 'super_admin', NULL::uuid)
            )
        )
      )
    `);

    // Política service role: bypass para testes automatizados
    await queryRunner.query(`
      CREATE POLICY emociograma_alerts_service_role_policy
      ON emociograma_alerts
      FOR ALL
      USING (
        current_setting('request.jwt.claim.sub', true) = '00000000-0000-0000-0000-000000000001'
      )
      WITH CHECK (
        current_setting('request.jwt.claim.sub', true) = '00000000-0000-0000-0000-000000000001'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // ROLLBACK - Ordem inversa da criação
    // ============================================================

    // --- Remover políticas RLS ---
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_alerts_service_role_policy ON emociograma_alerts`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_alerts_delete_policy ON emociograma_alerts`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_alerts_update_policy ON emociograma_alerts`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_alerts_insert_policy ON emociograma_alerts`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_alerts_select_org_admin_policy ON emociograma_alerts`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_alerts_select_notified_policy ON emociograma_alerts`,
    );

    // --- Desabilitar RLS ---
    await queryRunner.query(
      `ALTER TABLE emociograma_alerts DISABLE ROW LEVEL SECURITY`,
    );

    // --- Remover índice parcial (criado via query raw) ---
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alerts_unresolved`);

    // --- Remover índices regulares ---
    await queryRunner.dropIndex('emociograma_alerts', 'idx_alerts_created');
    await queryRunner.dropIndex('emociograma_alerts', 'idx_alerts_severity');
    await queryRunner.dropIndex('emociograma_alerts', 'idx_alerts_submission');
    await queryRunner.dropIndex(
      'emociograma_alerts',
      'idx_alerts_organization',
    );

    // --- Remover chaves estrangeiras ---
    await queryRunner.dropForeignKey(
      'emociograma_alerts',
      'FK_emociograma_alerts_resolved_by',
    );
    await queryRunner.dropForeignKey(
      'emociograma_alerts',
      'FK_emociograma_alerts_submission',
    );
    await queryRunner.dropForeignKey(
      'emociograma_alerts',
      'FK_emociograma_alerts_organization',
    );

    // --- Remover constraints de verificação ---
    await queryRunner.query(`
      ALTER TABLE emociograma_alerts
      DROP CONSTRAINT IF EXISTS CHK_emociograma_alerts_severity
    `);
    await queryRunner.query(`
      ALTER TABLE emociograma_alerts
      DROP CONSTRAINT IF EXISTS CHK_emociograma_alerts_type
    `);

    // --- Remover tabela ---
    await queryRunner.dropTable('emociograma_alerts', true);
  }
}
