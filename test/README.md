# PsicoZen Backend - Test Suite

## Overview

Test suite com suporte completo a:
- ✅ **Idempotência**: Testes podem rodar múltiplas vezes sem conflitos
- ✅ **Isolamento**: Cada teste é independente e não afeta outros
- ✅ **RLS Support**: Testes validam Row Level Security policies
- ✅ **Multi-Org**: Testes de RBAC com múltiplas organizações

---

## Quick Start

```bash
# Setup test database (run once or when database is inconsistent)
npm run test:setup-db

# Run all tests
npm test

# Run specific test suites
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E tests only
npm run test:cov           # With coverage report

# Verify test idempotency (runs tests 3 times)
npm run test:idempotency
```

---

## Test Structure

```
test/
├── config/
│   ├── test-datasource.ts         # PostgreSQL staging connection
│   └── jest-*.json                # Jest configurations
├── fixtures/
│   ├── user.fixtures.ts           # User test data with unique SESSION_ID
│   ├── role.fixtures.ts           # Role test data
│   └── organization.fixtures.ts   # Organization test data with unique slugs
├── utils/
│   ├── test-database.helper.ts    # Database initialization and cleanup
│   └── reset-fixtures.helper.ts   # Fixture counter reset utility
├── scripts/
│   ├── setup-test-db.ts           # Complete database setup
│   ├── clean-all-test-data.ts     # Manual cleanup script
│   └── test-multiple-runs.sh      # Idempotency validation
├── integration/
│   ├── roles.integration.spec.ts              # RBAC integration tests
│   └── organization.repository.integration.spec.ts  # Org repository tests
└── *.e2e-spec.ts                  # E2E API tests
    ├── rbac.e2e-spec.ts           # RBAC authorization tests
    └── organizations.e2e-spec.ts  # Organizations CRUD tests
```

---

## Idempotency Strategy

### 1. Unique Data Generation

**Session-Based Uniqueness:**
```typescript
// User fixtures include SESSION_ID in email
const SESSION_ID = Date.now().toString(36);
email: `user-${SESSION_ID}@test.com`  // ✅ Unique per test run

// Organization fixtures include SESSION_ID in slug
slug: `organization-name-${SESSION_ID}`  // ✅ Unique per test run
```

**Timestamp-Based IDs:**
```typescript
// Each fixture generates unique UUID-like IDs
function generateTestId(): string {
  const timestamp = Date.now().toString(16);
  const counter = fixtureCounter.toString(16);
  const random = Math.random().toString(16).substring(2, 10);
  return `${timestamp}-${counter}-4000-8000-${random}`;
}
```

### 2. Fixture Counter Reset

**Automatic Reset in Tests:**
```typescript
import { resetAllFixtures } from '../utils/reset-fixtures.helper';

afterEach(async () => {
  resetAllFixtures();  // ✅ Prevents counter accumulation
  await clearDatabase();
});
```

### 3. Smart Database Cleanup

**Preserves Seed Data:**
```typescript
// clearDatabase() deletes ONLY test data, preserves:
// ✅ System roles (is_system_role = true)
// ✅ Service role user (supabase_user_id = '00000000-0000-0000-0000-000000000001')
// ✅ Seed permissions and role_permissions

// Deletes:
// 🧹 user_roles (test assignments)
// 🧹 sessions (test sessions)
// 🧹 users (except service role)
// 🧹 organizations (all test orgs)
```

### 4. RLS Context Management

**Service Role for Fixtures:**
```typescript
// Create fixtures in service role context (bypasses RLS)
const user = await runAsServiceRole(async () => {
  return userRepository.save(createUserFixture({
    email: 'test@example.com',
    supabaseUserId: 'test-uuid',
  }));
});

// Business logic assertions run in user context (validates RLS)
const result = await runInRlsContext(user.supabaseUserId, async () => {
  return userRepository.findById(user.id);
});
```

---

## Database State Management

### Initial Setup

```bash
# If tests fail with "No roles found" or similar errors:
npm run test:setup-db
```

This script:
1. Runs pending migrations
2. Verifies seed data exists (system roles, service user)
3. Creates seed data if missing
4. Cleans existing test data
5. Validates final state

### Manual Cleanup

```bash
# Clean all test data manually
npx ts-node test/scripts/clean-all-test-data.ts

# Check database state
npx ts-node test/scripts/simple-db-check.ts
```

---

## Common Issues

### Problem: "No roles found in database"

**Cause:** Seed roles missing or migrations not executed

**Solution:**
```bash
npm run test:setup-db  # Creates seed data if missing
```

### Problem: "Duplicate key violation" on email/slug

**Cause:** Old test data not cleaned properly

**Solution:**
```bash
npx ts-node test/scripts/clean-all-test-data.ts
npm run test:integration  # Should pass now
```

### Problem: "Foreign key constraint violation"

**Cause:** Creating user_roles without RLS context

**Solution:**
```typescript
// ❌ Wrong: Direct assignment without RLS context
await roleRepository.assignRoleToUser({ userId, roleId, organizationId });

// ✅ Correct: Wrap in service role context
await runAsServiceRole(async () => {
  await roleRepository.assignRoleToUser({ userId, roleId, organizationId });
});
```

### Problem: Tests pass individually but fail when run together

**Cause:** Missing `resetAllFixtures()` call

**Solution:**
```typescript
afterEach(async () => {
  resetAllFixtures();  // ✅ Add this
  await clearDatabase();
});
```

---

## Test Guidelines

### DO ✅

1. **Use `runAsServiceRole()` for fixture creation**
   ```typescript
   const user = await runAsServiceRole(async () => {
     return userRepository.save(userFixture);
   });
   ```

2. **Reset fixtures in `afterEach()`**
   ```typescript
   afterEach(async () => {
     resetAllFixtures();
     await clearDatabase();
   });
   ```

3. **Let fixtures generate unique data automatically**
   ```typescript
   const user = createUserFixture();  // Auto-generates unique email
   const org = createCompanyFixture();  // Auto-generates unique slug
   ```

4. **Use `clearDatabase()` for cleanup (not manual DELETE)**
   ```typescript
   afterEach(async () => {
     await clearDatabase();  // ✅ Smart cleanup
   });
   ```

### DON'T ❌

1. **Don't create fixtures with hardcoded emails without SESSION_ID**
   ```typescript
   // ❌ Will conflict on multiple runs
   const user = createUserFixture({ email: 'fixed@test.com' });

   // ✅ Fixtures add SESSION_ID automatically
   const user = createUserFixture({ email: 'user@test.com' });
   // Result: user-ltxyz123@test.com (unique per session)
   ```

2. **Don't delete seed data manually**
   ```typescript
   // ❌ Never do this
   await dataSource.query('DELETE FROM roles');

   // ✅ Use clearDatabase() which preserves seed data
   await clearDatabase();
   ```

3. **Don't skip RLS context in integration tests**
   ```typescript
   // ❌ Will fail with FK violations
   await roleRepository.assignRoleToUser({ ... });

   // ✅ Wrap in RLS context
   await runAsServiceRole(async () => {
     await roleRepository.assignRoleToUser({ ... });
   });
   ```

4. **Don't forget to reset fixtures**
   ```typescript
   // ❌ Counters accumulate, causing issues
   afterEach(async () => {
     await clearDatabase();
   });

   // ✅ Reset counters too
   afterEach(async () => {
     resetAllFixtures();
     await clearDatabase();
   });
   ```

---

## Adding New Tests

### Integration Test Template

```typescript
import {
  initializeTestDatabase,
  clearDatabase,
  closeDatabase,
  getTestDataSource,
  runAsServiceRole,
} from '../utils/test-database.helper';
import { resetAllFixtures } from '../utils/reset-fixtures.helper';
import { createUserFixture } from '../fixtures/user.fixtures';
import { createCompanyFixture } from '../fixtures/organization.fixtures';

describe('Feature Integration Tests', () => {
  beforeAll(async () => {
    await initializeTestDatabase();
  });

  afterEach(async () => {
    resetAllFixtures();  // ✅ Always reset fixtures
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('should test feature', async () => {
    // Create fixtures in service role context
    const { user, org } = await runAsServiceRole(async () => {
      const user = await userRepository.save(createUserFixture());
      const org = await orgRepository.save(createCompanyFixture());
      return { user, org };
    });

    // Test business logic
    const result = await featureService.execute(user.id, org.id);
    expect(result).toBeDefined();
  });
});
```

### E2E Test Template

```typescript
import {
  initializeTestDatabase,
  clearDatabase,
  closeDatabase,
  runAsServiceRole,
} from './utils/test-database.helper';
import { resetAllFixtures } from './utils/reset-fixtures.helper';

describe('Feature API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await initializeTestDatabase();
    // ... setup app
  });

  beforeEach(async () => {
    resetAllFixtures();  // ✅ Always reset fixtures
    await clearDatabase();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('POST /endpoint should work', async () => {
    // ... test
  });
});
```

---

## Verification

### Verify Idempotency

```bash
# Run integration tests 3 times
npm run test:idempotency

# Expected output:
# Run #1: ✅ All tests passed
# Run #2: ✅ All tests passed
# Run #3: ✅ All tests passed
```

### Verify Database State

```bash
# Check current state
npx ts-node test/scripts/simple-db-check.ts

# Expected output:
# 📊 Roles: 4 (system roles)
# 👤 Users: 1 (service role user)
# 🏢 Organizations: 0 (cleaned)
# 🔗 User Roles: 0 (cleaned)
```

---

## Continuous Integration

### CI Pipeline Requirements

1. **Before tests:**
   ```bash
   npm run test:setup-db  # Ensure clean state
   ```

2. **Run tests:**
   ```bash
   npm run test:integration
   npm run test:e2e
   ```

3. **Verify idempotency (optional):**
   ```bash
   npm run test:idempotency
   ```

### Environment Variables

Required in `.env.test`:
```env
# Database (PostgreSQL Staging)
DB_HOST=your-staging-host
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=teste

# Supabase (use staging project)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_JWT_SECRET=your-jwt-secret

# JWT (backend tokens)
JWT_SECRET=your-test-jwt-secret
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d
```

---

## Maintenance

### When to Run Setup

Run `npm run test:setup-db` if you experience:
- ❌ "No roles found in database"
- ❌ "Service role user not found"
- ❌ Migration errors
- ❌ Tests passing individually but failing together
- ❌ After manual database operations

### When Tests Should Pass

✅ **Single run**: All tests pass
✅ **Multiple runs**: Tests pass 3+ times consecutively
✅ **Parallel**: Tests pass with `--runInBand` and without
✅ **After failures**: Tests pass after fixing errors

---

## Architecture Notes

### Why Session-Based Uniqueness?

Traditional test isolation strategies:
- ❌ Database rollback: Doesn't work well with RLS and complex FK relationships
- ❌ Test-specific schemas: Complex to manage, slow
- ❌ Mocked data: Doesn't test real database constraints

Our approach:
- ✅ **Unique data per session**: Each test run has unique emails/slugs
- ✅ **Smart cleanup**: Preserves seed data, deletes test data
- ✅ **RLS-aware**: Uses service role for fixtures, user context for assertions
- ✅ **FK-safe**: Deletes in correct order respecting constraints

### Why Not TRUNCATE?

```sql
-- ❌ TRUNCATE is too aggressive
TRUNCATE users CASCADE;  -- Deletes seed roles via CASCADE!

-- ✅ DELETE with filters preserves seed data
DELETE FROM users WHERE supabase_user_id != 'service-role-id';
```

### Why Service Role Context?

```typescript
// Problem: RLS policies block fixture creation
// RLS requires auth.uid() but tests run without Supabase auth

// Solution: Service role user with bypass policies
const SERVICE_ROLE_UUID = '00000000-0000-0000-0000-000000000001';

// Fixtures created as service role (bypasses RLS)
await runAsServiceRole(async () => {
  return userRepository.save(userFixture);
});

// Business logic tested as actual user (validates RLS)
await runInRlsContext(user.supabaseUserId, async () => {
  return userRepository.find();  // RLS filters applied
});
```

---

## Performance

**Current Benchmarks:**
- Integration tests: ~45 tests in ~40s (~0.9s per test)
- E2E tests: ~67 tests in ~165s (~2.5s per test)
- Total suite: ~112 tests in ~3.5 minutes

**Optimization Tips:**
- Use `--runInBand` to avoid connection pool issues
- Keep fixtures minimal (only required fields)
- Clean database between tests, not before (afterEach not beforeEach)
- Group related tests to share beforeAll setup when possible

---

## Troubleshooting

### Migration State Issues

```bash
# Check migration status
npm run migration:show

# If migrations table is inconsistent:
npm run test:setup-db  # Fixes migration state
```

### Database Connection Issues

```bash
# Verify connection
npx ts-node test/scripts/simple-db-check.ts

# Should show:
# ✅ Connected
# 📊 Roles: 4
# 👤 Users: 1 (service role)
```

### RLS Policy Issues

```bash
# Validate RLS enforcement
npm run test:rls

# Common RLS errors:
# - "permission denied": Missing RLS policy
# - "FK violation": Creating without RLS context
```

---

## Key Files

| File | Purpose |
|------|---------|
| `test-database.helper.ts` | Database init, cleanup, RLS context |
| `reset-fixtures.helper.ts` | Reset all fixture counters |
| `setup-test-db.ts` | Complete database setup script |
| `*.fixtures.ts` | Test data generators with uniqueness |
| `jest-*.json` | Jest configurations for each suite |

---

## Future Improvements

- [ ] Add test database health check to CI pipeline
- [ ] Implement parallel test execution (currently sequential for stability)
- [ ] Add mutation testing for critical paths
- [ ] Create visual test reports
- [ ] Add performance regression tests
