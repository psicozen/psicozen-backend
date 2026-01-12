import { DataSource, DataSourceOptions } from 'typeorm';
import { TestOrganizationSchema } from './test-organization.schema';

export const testDataSourceOptions: DataSourceOptions = {
  type: 'better-sqlite3',
  database: ':memory:',
  entities: [TestOrganizationSchema],
  synchronize: true,
  dropSchema: true,
  logging: false,
};

export const TestDataSource = new DataSource(testDataSourceOptions);
