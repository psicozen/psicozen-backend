import { DataSource, DataSourceOptions } from 'typeorm';
import { OrganizationSchema } from '../../src/modules/organizations/infrastructure/persistence/organization.schema';

export const testDataSourceOptions: DataSourceOptions = {
  type: 'better-sqlite3',
  database: ':memory:',
  entities: [OrganizationSchema],
  synchronize: true,
  dropSchema: true,
  logging: false,
};

export const TestDataSource = new DataSource(testDataSourceOptions);
