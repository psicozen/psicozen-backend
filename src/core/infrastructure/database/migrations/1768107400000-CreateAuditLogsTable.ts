import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration para criar a tabela de logs de auditoria
 *
 * Esta tabela é essencial para conformidade LGPD, registrando todas as
 * operações relacionadas a dados pessoais (exportação, exclusão, anonimização).
 *
 * Política de retenção: 2 anos (conforme LGPD)
 */
export class CreateAuditLogsTable1768107400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tabela audit_logs
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'action',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment:
              'Tipo de ação: user_data_exported, user_data_deleted, user_data_anonymized, etc.',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
            comment: 'ID do usuário alvo ou que realizou a ação',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true,
            comment: 'ID da organização relacionada',
          },
          {
            name: 'performed_by',
            type: 'uuid',
            isNullable: true,
            comment:
              'ID do usuário que executou a ação (se diferente do user_id)',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
            comment: 'Metadados adicionais da ação',
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
            comment: 'Endereço IP (suporta IPv4 e IPv6)',
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
            comment: 'User Agent do cliente',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 2. Criar índices para consultas frequentes
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_action',
        columnNames: ['action'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Índice composto para consultas de trilha de auditoria por usuário
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_user_org_created',
        columnNames: ['user_id', 'organization_id', 'created_at'],
      }),
    );

    // 3. Criar foreign keys
    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        name: 'FK_audit_logs_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        name: 'FK_audit_logs_organization_id',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        name: 'FK_audit_logs_performed_by',
        columnNames: ['performed_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 4. Habilitar RLS
    await queryRunner.query(`
      ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    `);

    // 5. Criar política para SELECT - apenas admins podem visualizar logs
    await queryRunner.query(`
      CREATE POLICY audit_logs_select_admin_policy ON audit_logs
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);

    // 6. Política para usuários verem seus próprios logs
    await queryRunner.query(`
      CREATE POLICY audit_logs_select_own_policy ON audit_logs
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND u.id = audit_logs.user_id
          )
        );
    `);

    // 7. Política para INSERT - service role e admins podem inserir
    await queryRunner.query(`
      CREATE POLICY audit_logs_insert_policy ON audit_logs
        FOR INSERT
        WITH CHECK (
          -- Service role pode inserir (backend)
          current_setting('role', true) = 'service_role'
          OR EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);

    // 8. Política para DELETE - apenas service role para cleanup automático
    await queryRunner.query(`
      CREATE POLICY audit_logs_delete_policy ON audit_logs
        FOR DELETE
        USING (
          current_setting('role', true) = 'service_role'
        );
    `);

    // 9. Comentário na tabela
    await queryRunner.query(`
      COMMENT ON TABLE audit_logs IS 'Trilha de auditoria para conformidade LGPD. Retenção: 2 anos.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover políticas RLS
    await queryRunner.query(
      `DROP POLICY IF EXISTS audit_logs_delete_policy ON audit_logs;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS audit_logs_select_own_policy ON audit_logs;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS audit_logs_select_admin_policy ON audit_logs;`,
    );

    // Desabilitar RLS
    await queryRunner.query(
      `ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;`,
    );

    // Remover tabela (automaticamente remove índices e foreign keys)
    await queryRunner.dropTable('audit_logs');
  }
}
