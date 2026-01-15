/**
 * Helper to reset all fixture counters
 *
 * Import and call this in beforeEach() hooks to ensure clean state
 * between test runs and prevent conflicts from counter accumulation.
 */

import { resetUserFixtureCounter } from '../fixtures/user.fixtures';
import { resetRoleFixtureCounter } from '../fixtures/role.fixtures';
import { resetFixtureCounter as resetOrgFixtureCounter } from '../fixtures/organization.fixtures';

/**
 * Reset all fixture counters to initial state
 *
 * Call this in beforeEach() to prevent counter accumulation across tests:
 *
 * @example
 * ```typescript
 * import { resetAllFixtures } from '../utils/reset-fixtures.helper';
 *
 * beforeEach(async () => {
 *   resetAllFixtures();
 *   await clearDatabase();
 * });
 * ```
 */
export function resetAllFixtures(): void {
  resetUserFixtureCounter();
  resetRoleFixtureCounter();
  resetOrgFixtureCounter();
}
