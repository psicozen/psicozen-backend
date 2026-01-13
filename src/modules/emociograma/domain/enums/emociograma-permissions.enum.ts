/**
 * Permissoes do modulo Emociograma
 *
 * Formato: resource:action:scope
 * - resource: emociograma
 * - action: submit, view, export, configure, manage
 * - scope: own, team, all (nivel de acesso)
 */
export enum EmociogramaPermissions {
  // ============================================
  // PERMISSOES DE COLABORADOR (enviar e visualizar proprios dados)
  // ============================================

  /** Enviar proprio estado emocional */
  SUBMIT_OWN = 'emociograma:submit:own',

  /** Visualizar proprio historico de submissoes */
  VIEW_OWN = 'emociograma:view:own',

  // ============================================
  // PERMISSOES DE GESTOR (acesso em nivel de equipe)
  // ============================================

  /** Visualizar dados agregados da equipe (sem identidades individuais) */
  VIEW_TEAM_AGGREGATED = 'emociograma:view:team_aggregated',

  /** Visualizar lista anonimizada de submissoes da equipe */
  VIEW_TEAM_ANONYMIZED = 'emociograma:view:team_anonymized',

  /** Exportar dados da equipe (CSV/Excel) */
  EXPORT_TEAM_DATA = 'emociograma:export:team',

  // ============================================
  // PERMISSOES DE ADMIN (acesso em nivel de organizacao)
  // ============================================

  /** Visualizar dados agregados da organizacao */
  VIEW_ALL_AGGREGATED = 'emociograma:view:all_aggregated',

  /** Visualizar submissoes identificadas (pode ver quem enviou) */
  VIEW_ALL_IDENTIFIED = 'emociograma:view:all_identified',

  /** Exportar todos os dados da organizacao */
  EXPORT_ALL_DATA = 'emociograma:export:all',

  /** Configurar limites de alerta e notificacoes */
  CONFIGURE_ALERTS = 'emociograma:configure:alerts',

  /** Gerenciar categorias de emocao */
  MANAGE_CATEGORIES = 'emociograma:manage:categories',
}

/**
 * Conjuntos de permissoes para atribuicao facil de papeis
 *
 * Cada papel inclui as permissoes do papel anterior (heranca hierarquica):
 * - COLABORADOR: permissoes basicas de usuario
 * - GESTOR: COLABORADOR + acesso a dados da equipe
 * - ADMIN: GESTOR + acesso completo a organizacao
 */
export const EMOCIOGRAMA_PERMISSION_SETS = {
  /** Permissoes para colaboradores: enviar e visualizar proprios dados */
  COLABORADOR: [
    EmociogramaPermissions.SUBMIT_OWN,
    EmociogramaPermissions.VIEW_OWN,
  ] as const,

  /** Permissoes para gestores: colaborador + acesso a dados da equipe */
  GESTOR: [
    EmociogramaPermissions.SUBMIT_OWN,
    EmociogramaPermissions.VIEW_OWN,
    EmociogramaPermissions.VIEW_TEAM_AGGREGATED,
    EmociogramaPermissions.VIEW_TEAM_ANONYMIZED,
    EmociogramaPermissions.EXPORT_TEAM_DATA,
  ] as const,

  /** Permissoes para admins: gestor + acesso completo a organizacao */
  ADMIN: [
    EmociogramaPermissions.SUBMIT_OWN,
    EmociogramaPermissions.VIEW_OWN,
    EmociogramaPermissions.VIEW_TEAM_AGGREGATED,
    EmociogramaPermissions.VIEW_TEAM_ANONYMIZED,
    EmociogramaPermissions.EXPORT_TEAM_DATA,
    EmociogramaPermissions.VIEW_ALL_AGGREGATED,
    EmociogramaPermissions.VIEW_ALL_IDENTIFIED,
    EmociogramaPermissions.EXPORT_ALL_DATA,
    EmociogramaPermissions.CONFIGURE_ALERTS,
    EmociogramaPermissions.MANAGE_CATEGORIES,
  ] as const,
} as const;

/** Tipo para os nomes dos conjuntos de permissoes */
export type EmociogramaPermissionSetName =
  keyof typeof EMOCIOGRAMA_PERMISSION_SETS;

/** Tipo para as permissoes do Emociograma */
export type EmociogramaPermissionValue =
  (typeof EmociogramaPermissions)[keyof typeof EmociogramaPermissions];
