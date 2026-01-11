/**
 * Configurações específicas da organização para recursos e conformidade
 */
export interface OrganizationSettings {
  /** Fuso horário para exibição de data/hora (identificador IANA) */
  timezone: string;

  /** Localidade para internacionalização (tag de idioma BCP 47) */
  locale: string;

  /** Ativar/desativar o recurso Emociograma para esta organização */
  emociogramaEnabled: boolean;

  /** Limite do estado emocional para disparar alertas (escala 1-10) */
  alertThreshold: number;

  /** Período de retenção de dados em dias (conformidade LGPD) */
  dataRetentionDays: number;

  /** Configuração padrão de anonimato para envios */
  anonymityDefault: boolean;
}

/**
 * Configurações padrão da organização
 */
export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  timezone: 'America/Sao_Paulo',
  locale: 'pt-BR',
  emociogramaEnabled: true,
  alertThreshold: 6,
  dataRetentionDays: 365,
  anonymityDefault: false,
};

/**
 * Factory para criar configurações de organização com valores padrão
 * @param overrides - Propriedades para sobrescrever os valores padrão
 * @returns Configurações completas da organização
 */
export function createOrganizationSettings(
  overrides?: Partial<OrganizationSettings>,
): OrganizationSettings {
  return {
    ...DEFAULT_ORGANIZATION_SETTINGS,
    ...overrides,
  };
}
