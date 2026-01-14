import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migração: Criação das Tabelas do Emociograma
 *
 * Esta migração cria:
 * 1. emociograma_categories - Tabela de lookup com 10 categorias predefinidas
 * 2. emociograma_submissions - Tabela principal de submissões emocionais
 *
 * Inclui:
 * - Índices de performance para consultas frequentes
 * - Políticas RLS (Row Level Security) para segurança multi-tenant
 * - Constraint de verificação para emotion_level (1-10)
 * - Dados iniciais das categorias
 */
export class CreateEmociogramaTablesAndRLS1768105450000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // PARTE 1: CRIAÇÃO DA TABELA DE CATEGORIAS
    // ============================================================

    await queryRunner.createTable(
      new Table({
        name: 'emociograma_categories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'Emoji ou nome do ícone para exibição',
          },
          {
            name: 'display_order',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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

    // Índice para ordenação por display_order
    await queryRunner.createIndex(
      'emociograma_categories',
      new TableIndex({
        name: 'IDX_emociograma_categories_display_order',
        columnNames: ['display_order'],
      }),
    );

    // Índice para filtrar categorias ativas
    await queryRunner.createIndex(
      'emociograma_categories',
      new TableIndex({
        name: 'IDX_emociograma_categories_is_active',
        columnNames: ['is_active'],
      }),
    );

    // ============================================================
    // PARTE 2: CRIAÇÃO DA TABELA DE SUBMISSÕES
    // ============================================================

    await queryRunner.createTable(
      new Table({
        name: 'emociograma_submissions',
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
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'emotion_level',
            type: 'integer',
            isNullable: false,
            comment: 'Nível emocional de 1 (muito ruim) a 10 (excelente)',
          },
          {
            name: 'emotion_emoji',
            type: 'varchar',
            length: '10',
            isNullable: false,
            comment: 'Emoji representando o estado emocional',
          },
          {
            name: 'category_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'is_anonymous',
            type: 'boolean',
            isNullable: false,
            default: false,
            comment: 'Se true, a identidade do usuário é oculta nos relatórios',
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
            comment: 'Comentário opcional do usuário',
          },
          {
            name: 'comment_flagged',
            type: 'boolean',
            default: false,
            comment: 'Marcado para moderação',
          },
          {
            name: 'submitted_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
            comment: 'Data/hora da submissão',
          },
          {
            name: 'department',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Departamento do usuário no momento da submissão',
          },
          {
            name: 'team',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Equipe do usuário no momento da submissão',
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Soft delete - data de exclusão',
          },
        ],
      }),
      true,
    );

    // ============================================================
    // PARTE 3: CONSTRAINT DE VERIFICAÇÃO
    // ============================================================

    await queryRunner.query(`
      ALTER TABLE emociograma_submissions
      ADD CONSTRAINT CHK_emociograma_emotion_level
      CHECK (emotion_level BETWEEN 1 AND 10)
    `);

    // ============================================================
    // PARTE 4: CHAVES ESTRANGEIRAS
    // ============================================================

    // FK: organization_id -> organizations(id)
    await queryRunner.createForeignKey(
      'emociograma_submissions',
      new TableForeignKey({
        name: 'FK_emociograma_submissions_organization',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK: user_id -> users(id)
    await queryRunner.createForeignKey(
      'emociograma_submissions',
      new TableForeignKey({
        name: 'FK_emociograma_submissions_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK: category_id -> emociograma_categories(id)
    await queryRunner.createForeignKey(
      'emociograma_submissions',
      new TableForeignKey({
        name: 'FK_emociograma_submissions_category',
        columnNames: ['category_id'],
        referencedTableName: 'emociograma_categories',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT', // Não permite deletar categoria em uso
      }),
    );

    // ============================================================
    // PARTE 5: ÍNDICES DE PERFORMANCE
    // ============================================================

    // Índice composto: organização + usuário (consultas de submissões do usuário)
    await queryRunner.createIndex(
      'emociograma_submissions',
      new TableIndex({
        name: 'idx_emociograma_org_user',
        columnNames: ['organization_id', 'user_id'],
      }),
    );

    // Índice composto: organização + data (consultas baseadas em tempo)
    await queryRunner.createIndex(
      'emociograma_submissions',
      new TableIndex({
        name: 'idx_emociograma_org_date',
        columnNames: ['organization_id', 'submitted_at'],
      }),
    );

    // Índice: nível emocional (detecção de alertas)
    await queryRunner.createIndex(
      'emociograma_submissions',
      new TableIndex({
        name: 'idx_emociograma_emotion_level',
        columnNames: ['emotion_level'],
      }),
    );

    // Índice: categoria (relatórios por categoria)
    await queryRunner.createIndex(
      'emociograma_submissions',
      new TableIndex({
        name: 'idx_emociograma_category',
        columnNames: ['category_id'],
      }),
    );

    // Índice: anonimato (filtragem)
    await queryRunner.createIndex(
      'emociograma_submissions',
      new TableIndex({
        name: 'idx_emociograma_anonymous',
        columnNames: ['is_anonymous'],
      }),
    );

    // Índice composto: organização + departamento (agregações por departamento)
    await queryRunner.createIndex(
      'emociograma_submissions',
      new TableIndex({
        name: 'idx_emociograma_department',
        columnNames: ['organization_id', 'department'],
      }),
    );

    // Índice composto: organização + equipe (agregações por equipe)
    await queryRunner.createIndex(
      'emociograma_submissions',
      new TableIndex({
        name: 'idx_emociograma_team',
        columnNames: ['organization_id', 'team'],
      }),
    );

    // Índice parcial: apenas submissões ativas (soft delete aware)
    await queryRunner.query(`
      CREATE INDEX idx_emociograma_active
      ON emociograma_submissions(organization_id, submitted_at)
      WHERE deleted_at IS NULL
    `);

    // ============================================================
    // PARTE 6: INSERÇÃO DAS CATEGORIAS PADRÃO
    // ============================================================

    await queryRunner.query(`
      INSERT INTO emociograma_categories (name, slug, description, icon, display_order) VALUES
        ('Pessoal', 'pessoal', 'Questões relacionadas à vida pessoal e autodesenvolvimento', '👤', 1),
        ('Trabalho', 'trabalho', 'Questões relacionadas ao ambiente e atividades de trabalho', '💼', 2),
        ('Família', 'familia', 'Questões relacionadas a relacionamentos familiares', '👨‍👩‍👧‍👦', 3),
        ('Saúde', 'saude', 'Questões relacionadas à saúde física e mental', '🏥', 4),
        ('Financeiro', 'financeiro', 'Questões relacionadas a finanças pessoais', '💰', 5),
        ('Relacionamento/Social', 'relacionamento_social', 'Questões relacionadas a amizades e vida social', '🤝', 6),
        ('Intelectual', 'intelectual', 'Questões relacionadas a aprendizado e crescimento intelectual', '📚', 7),
        ('Emocional/Psicológico', 'emocional_psicologico', 'Questões relacionadas ao bem-estar emocional', '🧠', 8),
        ('Estilo de Vida', 'estilo_vida', 'Questões relacionadas a hábitos e rotina diária', '🌟', 9),
        ('Outros', 'outros', 'Outras questões não categorizadas', '📋', 10)
    `);

    // ============================================================
    // PARTE 7: ROW LEVEL SECURITY (RLS)
    // ============================================================

    // --- RLS para emociograma_categories (tabela de lookup) ---

    await queryRunner.query(`
      ALTER TABLE emociograma_categories ENABLE ROW LEVEL SECURITY
    `);

    // Política SELECT: qualquer usuário autenticado pode ler categorias ativas
    await queryRunner.query(`
      CREATE POLICY emociograma_categories_select_policy
      ON emociograma_categories
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL
        AND is_active = true
      )
    `);

    // Política SELECT para admin: pode ver todas as categorias (incluindo inativas)
    await queryRunner.query(`
      CREATE POLICY emociograma_categories_select_admin_policy
      ON emociograma_categories
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND public.user_has_role(u.id, 'super_admin', NULL::uuid)
        )
      )
    `);

    // Política INSERT: apenas super_admin pode criar categorias
    await queryRunner.query(`
      CREATE POLICY emociograma_categories_insert_policy
      ON emociograma_categories
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND public.user_has_role(u.id, 'super_admin', NULL::uuid)
        )
      )
    `);

    // Política UPDATE: apenas super_admin pode atualizar categorias
    await queryRunner.query(`
      CREATE POLICY emociograma_categories_update_policy
      ON emociograma_categories
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND public.user_has_role(u.id, 'super_admin', NULL::uuid)
        )
      )
    `);

    // Política DELETE: apenas super_admin pode deletar categorias
    await queryRunner.query(`
      CREATE POLICY emociograma_categories_delete_policy
      ON emociograma_categories
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND public.user_has_role(u.id, 'super_admin', NULL::uuid)
        )
      )
    `);

    // --- RLS para emociograma_submissions ---

    await queryRunner.query(`
      ALTER TABLE emociograma_submissions ENABLE ROW LEVEL SECURITY
    `);

    // Política SELECT: usuário vê suas próprias submissões
    await queryRunner.query(`
      CREATE POLICY emociograma_submissions_select_own_policy
      ON emociograma_submissions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND u.id = emociograma_submissions.user_id
        )
        AND deleted_at IS NULL
      )
    `);

    // Política SELECT: admin da organização vê todas as submissões da org
    await queryRunner.query(`
      CREATE POLICY emociograma_submissions_select_org_admin_policy
      ON emociograma_submissions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND (
              public.user_has_role(u.id, 'admin', emociograma_submissions.organization_id)
              OR public.user_has_role(u.id, 'super_admin', NULL::uuid)
            )
        )
        AND deleted_at IS NULL
      )
    `);

    // Política INSERT: usuário pode criar submissões apenas para si mesmo
    await queryRunner.query(`
      CREATE POLICY emociograma_submissions_insert_policy
      ON emociograma_submissions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND u.id = emociograma_submissions.user_id
        )
      )
    `);

    // Política UPDATE: usuário pode atualizar apenas suas próprias submissões
    await queryRunner.query(`
      CREATE POLICY emociograma_submissions_update_own_policy
      ON emociograma_submissions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND u.id = emociograma_submissions.user_id
        )
        AND deleted_at IS NULL
      )
    `);

    // Política UPDATE: admin pode atualizar submissões (ex: flag de moderação)
    await queryRunner.query(`
      CREATE POLICY emociograma_submissions_update_admin_policy
      ON emociograma_submissions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND (
              public.user_has_role(u.id, 'admin', emociograma_submissions.organization_id)
              OR public.user_has_role(u.id, 'super_admin', NULL::uuid)
            )
        )
      )
    `);

    // Política DELETE: usuário pode soft-delete apenas suas próprias submissões
    await queryRunner.query(`
      CREATE POLICY emociograma_submissions_delete_own_policy
      ON emociograma_submissions
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND u.id = emociograma_submissions.user_id
        )
      )
    `);

    // Política DELETE: admin pode soft-delete qualquer submissão da org
    await queryRunner.query(`
      CREATE POLICY emociograma_submissions_delete_admin_policy
      ON emociograma_submissions
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.supabase_user_id = auth.uid()
            AND (
              public.user_has_role(u.id, 'admin', emociograma_submissions.organization_id)
              OR public.user_has_role(u.id, 'super_admin', NULL::uuid)
            )
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // ROLLBACK - Ordem inversa da criação
    // ============================================================

    // --- Remover políticas RLS de emociograma_submissions ---
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_submissions_delete_admin_policy ON emociograma_submissions`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_submissions_delete_own_policy ON emociograma_submissions`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_submissions_update_admin_policy ON emociograma_submissions`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_submissions_update_own_policy ON emociograma_submissions`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_submissions_insert_policy ON emociograma_submissions`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_submissions_select_org_admin_policy ON emociograma_submissions`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_submissions_select_own_policy ON emociograma_submissions`,
    );

    // Desabilitar RLS em emociograma_submissions
    await queryRunner.query(
      `ALTER TABLE emociograma_submissions DISABLE ROW LEVEL SECURITY`,
    );

    // --- Remover políticas RLS de emociograma_categories ---
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_categories_delete_policy ON emociograma_categories`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_categories_update_policy ON emociograma_categories`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_categories_insert_policy ON emociograma_categories`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_categories_select_admin_policy ON emociograma_categories`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS emociograma_categories_select_policy ON emociograma_categories`,
    );

    // Desabilitar RLS em emociograma_categories
    await queryRunner.query(
      `ALTER TABLE emociograma_categories DISABLE ROW LEVEL SECURITY`,
    );

    // --- Remover índice parcial (criado via query raw) ---
    await queryRunner.query(`DROP INDEX IF EXISTS idx_emociograma_active`);

    // --- Remover índices de emociograma_submissions ---
    await queryRunner.dropIndex(
      'emociograma_submissions',
      'idx_emociograma_team',
    );
    await queryRunner.dropIndex(
      'emociograma_submissions',
      'idx_emociograma_department',
    );
    await queryRunner.dropIndex(
      'emociograma_submissions',
      'idx_emociograma_anonymous',
    );
    await queryRunner.dropIndex(
      'emociograma_submissions',
      'idx_emociograma_category',
    );
    await queryRunner.dropIndex(
      'emociograma_submissions',
      'idx_emociograma_emotion_level',
    );
    await queryRunner.dropIndex(
      'emociograma_submissions',
      'idx_emociograma_org_date',
    );
    await queryRunner.dropIndex(
      'emociograma_submissions',
      'idx_emociograma_org_user',
    );

    // --- Remover chaves estrangeiras ---
    await queryRunner.dropForeignKey(
      'emociograma_submissions',
      'FK_emociograma_submissions_category',
    );
    await queryRunner.dropForeignKey(
      'emociograma_submissions',
      'FK_emociograma_submissions_user',
    );
    await queryRunner.dropForeignKey(
      'emociograma_submissions',
      'FK_emociograma_submissions_organization',
    );

    // --- Remover constraint de verificação ---
    await queryRunner.query(`
      ALTER TABLE emociograma_submissions
      DROP CONSTRAINT IF EXISTS CHK_emociograma_emotion_level
    `);

    // --- Remover tabela emociograma_submissions ---
    await queryRunner.dropTable('emociograma_submissions', true);

    // --- Remover índices de emociograma_categories ---
    await queryRunner.dropIndex(
      'emociograma_categories',
      'IDX_emociograma_categories_is_active',
    );
    await queryRunner.dropIndex(
      'emociograma_categories',
      'IDX_emociograma_categories_display_order',
    );

    // --- Remover tabela emociograma_categories ---
    await queryRunner.dropTable('emociograma_categories', true);
  }
}
