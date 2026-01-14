import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { getTestDataSourceOptions } from '../config/test-datasource';

config({ path: resolve(__dirname, '../../.env.test') });

async function checkRoles() {
  const dataSource = new DataSource(getTestDataSourceOptions());
  await dataSource.initialize();

  const roles = await dataSource.query(
    'SELECT name, is_system_role FROM roles ORDER BY name',
  );
  console.log('✅ Roles in database:', roles);

  const permissions = await dataSource.query(
    'SELECT COUNT(*) as count FROM permissions',
  );
  console.log('✅ Permissions count:', permissions[0].count);

  const serviceUser = await dataSource.query(
    `SELECT id, email FROM users WHERE supabase_user_id = '00000000-0000-0000-0000-000000000001'`,
  );
  console.log('✅ Service user:', serviceUser);

  await dataSource.destroy();
}

checkRoles().catch(console.error);
