import { DataSource } from 'typeorm';
import { TestDataSource } from '../config/test-datasource';

let dataSource: DataSource;

export async function initializeTestDatabase(): Promise<DataSource> {
  if (!dataSource || !dataSource.isInitialized) {
    dataSource = TestDataSource;
    await dataSource.initialize();
  }
  return dataSource;
}

export async function clearDatabase(): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    // Disable foreign key constraints for SQLite during cleanup
    if (dataSource.options.type === 'better-sqlite3') {
      await dataSource.query('PRAGMA foreign_keys = OFF;');
    }

    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
    }

    // Re-enable foreign key constraints
    if (dataSource.options.type === 'better-sqlite3') {
      await dataSource.query('PRAGMA foreign_keys = ON;');
    }
  }
}

export async function closeDatabase(): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
}

export function getTestDataSource(): DataSource {
  return dataSource;
}
