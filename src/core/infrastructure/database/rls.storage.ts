import { AsyncLocalStorage } from 'async_hooks';
import { EntityManager } from 'typeorm';

/**
 * Storage for Request-Scoped Database Transactions
 *
 * This uses AsyncLocalStorage to store the EntityManager for the current request/execution context.
 * This allows singleton repositories to access the correct transaction manager without passing it
 * as an argument through every method.
 */
export const rlsStorage = new AsyncLocalStorage<EntityManager>();

/**
 * Run a callback with a specific EntityManager context
 */
export function runInTransaction<T>(
  manager: EntityManager,
  callback: () => Promise<T>,
): Promise<T> {
  return rlsStorage.run(manager, callback);
}

/**
 * Get the current transaction manager if one exists
 */
export function getTransactionManager(): EntityManager | undefined {
  return rlsStorage.getStore();
}
