/**
 * Organization Settings Interface
 * Defines configurable settings for an organization
 */
export interface OrganizationSettings {
  /**
   * Alert threshold for notifications (1-10)
   * Higher values = less sensitive alerts
   */
  alertThreshold: number;

  /**
   * Number of days to retain data (1-3650)
   */
  dataRetentionDays: number;
}

/**
 * Default organization settings
 */
export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  alertThreshold: 5,
  dataRetentionDays: 365,
};

/**
 * Organization type enum values
 */
export type OrganizationType = 'company' | 'department' | 'team';

export const VALID_ORGANIZATION_TYPES: OrganizationType[] = [
  'company',
  'department',
  'team',
];
