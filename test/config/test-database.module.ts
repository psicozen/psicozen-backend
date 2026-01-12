import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { testDataSourceOptions } from './test-datasource';
import { OrganizationSchema } from '../../src/modules/organizations/infrastructure/persistence/organization.schema';

@Module({
  imports: [
    TypeOrmModule.forRoot(testDataSourceOptions),
    TypeOrmModule.forFeature([OrganizationSchema]),
  ],
  exports: [TypeOrmModule],
})
export class TestDatabaseModule {}
