# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PsicoZen Backend - NestJS API with **Clean Architecture**, **SOLID principles**, and **Supabase integration**.

**Stack:**
- NestJS 11.x + TypeScript 5.7 (Node.js >=20.0.0, npm >=10.0.0)
- TypeORM + PostgreSQL
- Supabase (Auth Magic Link + Storage)
- Passport JWT Authentication
- Swagger/OpenAPI Documentation
- Jest (unit + E2E tests)

---

## Architecture: Clean Architecture (4 Layers)

```
Domain (Entities, Value Objects, Interfaces)
  ↑ depends on
Application (Use Cases, DTOs, Services)
  ↑ depends on
Infrastructure (TypeORM, Supabase, External Services)
  ↑ depends on
Presentation (Controllers, Guards, Decorators)
```

**Dependency Rule:** Outer layers depend on inner. Domain is framework-agnostic.

---

## Directory Structure

```
src/
├── core/                               # Shared/Common
│   ├── domain/
│   │   ├── entities/base.entity.ts     # Abstract base with timestamps
│   │   ├── repositories/base.repository.interface.ts
│   │   └── exceptions/                 # Domain exceptions
│   ├── application/
│   │   └── dtos/                       # Pagination, Response DTOs
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── typeorm.config.ts
│   │   │   └── migrations/
│   │   ├── repositories/
│   │   │   └── typeorm-base.repository.ts
│   │   └── supabase/
│   │       └── supabase.service.ts     # Request-scoped client
│   └── presentation/
│       ├── decorators/                 # @CurrentUser, @Roles, @Public
│       ├── guards/                     # RolesGuard
│       └── filters/                    # AllExceptionsFilter
│
├── modules/                            # Feature modules
│   ├── auth/                           # Magic Link Authentication
│   │   ├── domain/
│   │   │   ├── entities/session.entity.ts
│   │   │   └── repositories/session.repository.interface.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── send-magic-link.use-case.ts
│   │   │   │   ├── verify-magic-link.use-case.ts
│   │   │   │   ├── refresh-token.use-case.ts
│   │   │   │   └── logout.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   │   ├── persistence/session.schema.ts
│   │   │   ├── repositories/session.repository.ts
│   │   │   └── strategies/jwt.strategy.ts
│   │   ├── presentation/
│   │   │   ├── controllers/auth.controller.ts
│   │   │   └── guards/jwt-auth.guard.ts
│   │   └── auth.module.ts
│   │
│   ├── users/                          # User Management
│   │   ├── domain/
│   │   │   ├── entities/user.entity.ts
│   │   │   └── repositories/user.repository.interface.ts
│   │   ├── application/
│   │   │   ├── use-cases/              # CRUD use cases
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   │   ├── persistence/user.schema.ts
│   │   │   └── repositories/user.repository.ts
│   │   ├── presentation/
│   │   │   └── controllers/users.controller.ts
│   │   └── users.module.ts
│   │
│   ├── roles/                          # RBAC System
│   ├── files/                          # File Upload (Supabase Storage)
│   └── emails/                         # Email Notifications (Resend)
│
├── config/
│   ├── env.validation.ts               # Joi validation schema
│   ├── database.config.ts
│   └── supabase.config.ts
│
├── app.module.ts
└── main.ts
```

---

## Key Commands

```bash
# Development
npm run start:dev          # Watch mode with hot reload
npm run start:debug        # Debug mode

# Testing (MANDATORY: Every feature MUST have unit tests)
npm run test               # Unit tests
npm run test:watch         # Watch mode
npm run test:cov           # Coverage report
npm run test:e2e           # E2E tests

# Code Quality
npm run lint               # ESLint with auto-fix
npm run format             # Prettier formatting

# Build & Production
npm run build              # TypeScript compilation
npm run start:prod         # Production server
```

---

## Testing Rules (Mandatory)

🚨 **NON-NEGOTIABLE**: Every feature **MUST** include tests.  
❌ No tests = ❌ No feature.

### Requirements
- **Unit Tests**: `*.spec.ts` (alongside source files)
- **E2E Tests**: `test/*.e2e-spec.ts` (when applicable)
- **Coverage**: **≥ 80%** (lines, branches, functions, statements)
- **Isolation**: Use cases tested in isolation
- **Mocks**: Repository interfaces **must be mocked**

### Enforcement
- ❌ Never add features without tests  
- 🔴 Changes without tests are **blocked**

---

## Clean Architecture Patterns

### 1. Dependency Injection with Interfaces

```typescript
// Define interface and symbol
export interface IUserRepository extends IBaseRepository<UserEntity> {
  findByEmail(email: string): Promise<UserEntity | null>;
}
export const USER_REPOSITORY = Symbol('IUserRepository');

// Inject using symbol
constructor(
  @Inject(USER_REPOSITORY)
  private readonly userRepository: IUserRepository,
) {}

// Register in module
providers: [
  {
    provide: USER_REPOSITORY,
    useClass: UserRepository,
  },
]
```

### 2. Domain Entities (Business Logic)

```typescript
export class UserEntity extends BaseEntity {
  // Business methods
  updateProfile(data: UpdateData): void {
    Object.assign(this, data);
    this.touch(); // Updates updatedAt
  }

  recordLogin(): void {
    this.lastLoginAt = new Date();
    this.touch();
  }
}
```

### 3. Use Cases (Application Logic)

```typescript
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: CreateUserDto): Promise<UserEntity> {
    // Validation
    const exists = await this.userRepository.existsByEmail(dto.email);
    if (exists) throw new ConflictException('Email exists');

    // Business logic
    const user = UserEntity.create(dto.email, dto.firstName);

    // Persistence
    return this.userRepository.create(user);
  }
}
```

### 4. TypeORM Schemas (Persistence)

```typescript
@Entity('users')
export class UserSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'jsonb', default: {} })
  preferences: UserPreferences;

  // ... timestamps
}
```

### 5. Repository Implementation

```typescript
@Injectable()
export class UserRepository
  extends TypeOrmBaseRepository<UserSchema, UserEntity>
  implements IUserRepository
{
  constructor(@InjectRepository(UserSchema) repository: Repository<UserSchema>) {
    super(repository);
  }

  // Mappers
  toDomain(schema: UserSchema): UserEntity { /* ... */ }
  toEntity(domain: Partial<UserEntity>): UserSchema { /* ... */ }

  // Custom methods
  async findByEmail(email: string): Promise<UserEntity | null> {
    const schema = await this.repository.findOne({ where: { email } });
    return schema ? this.toDomain(schema) : null;
  }
}
```

---

## Authentication Flow (Magic Link)

```
1. POST /auth/send-magic-link { email }
   → Supabase sends email with magic link

2. GET /auth/callback?token_hash=xxx&type=magiclink
   → Verifies with Supabase
   → Creates/updates user in local DB
   → Generates JWT tokens (access + refresh)
   → Saves session

3. Protected routes use Authorization: Bearer <access_token>
   → JwtAuthGuard validates token
   → JwtStrategy verifies and returns user payload
   → @CurrentUser() decorator injects user into controller

4. POST /auth/refresh { refreshToken }
   → Validates refresh token
   → Generates new access token
   → Rotates refresh token (security best practice)

5. POST /auth/logout { refreshToken? }
   → Revokes specific session or all user sessions
```

---

## Adding New Modules

Follow this structure for consistency:

```
modules/[feature]/
├── domain/
│   ├── entities/[entity].entity.ts
│   ├── value-objects/
│   └── repositories/[entity].repository.interface.ts
├── application/
│   ├── use-cases/
│   │   ├── create-[entity].use-case.ts
│   │   ├── create-[entity].use-case.spec.ts  # MANDATORY
│   │   └── ...
│   └── dtos/
├── infrastructure/
│   ├── persistence/[entity].schema.ts
│   └── repositories/[entity].repository.ts
├── presentation/
│   └── controllers/[entity].controller.ts
└── [feature].module.ts
```

**Checklist:**
- [ ] Domain: Entity + Repository interface
- [ ] Application: DTOs + Use cases + **Tests**
- [ ] Infrastructure: Schema + Repository implementation
- [ ] Presentation: Controller with Swagger annotations
- [ ] Module: Wire all providers with DI
- [ ] Migration: Create database table
- [ ] Integration: Add to AppModule

---

## SOLID Principles Applied

**Single Responsibility:** Each use case does ONE thing
**Open/Closed:** BaseRepository extensible via inheritance
**Liskov Substitution:** All IRepository implementations are interchangeable
**Interface Segregation:** Domain-specific interfaces (IUserRepository ≠ IFileRepository)
**Dependency Inversion:** Use cases depend on interfaces, not concrete implementations

---

## Database Migrations

Located in: `src/core/infrastructure/database/migrations/`

**Tables:**
- `users` - User profiles with JSONB preferences
- `sessions` - Refresh token whitelist
- `roles`, `permissions`, `role_permissions`, `user_roles` - RBAC system
- `files` - File metadata (Supabase Storage integration)
- `organizations` - Multi-tenant organization hierarchy **with RLS**

**Commands:**
```bash
# Create migration (manual)
npm run migration:create src/core/infrastructure/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

---

## 🔐 Row Level Security (RLS) - MANDATORY RULE

**🚨 CRITICAL REQUIREMENT**: Every migration that creates a new table **MUST** include RLS policies.

**Why RLS is Required:**
- **Security First**: Protects data at the database level, not just application level
- **Multi-Tenancy**: Essential for organization/tenant isolation
- **Defense in Depth**: Even if application logic fails, database enforces access control
- **Supabase Integration**: Works seamlessly with Supabase Auth (`auth.uid()`)

### Standard RLS Implementation Pattern

```typescript
// In migration up() method after creating table:

// 1. Enable RLS
await queryRunner.query(`
  ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
`);

// 2. Create helper functions in public schema (CREATE OR REPLACE - idempotent)
// NOTE: Use 'public' schema, not 'auth' (auth is reserved by Supabase)
await queryRunner.query(`
  CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id UUID, p_role_name TEXT)
  RETURNS BOOLEAN AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = p_user_id AND r.name = p_role_name
    );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
`);

await queryRunner.query(`
  CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id UUID, p_permission_name TEXT)
  RETURNS BOOLEAN AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = p_user_id AND p.name = p_permission_name
    );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
`);

// 3. SELECT policies (basic + admin)
await queryRunner.query(`
  CREATE POLICY table_select_policy ON table_name
    FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND is_active = true
      AND deleted_at IS NULL
    );
`);

await queryRunner.query(`
  CREATE POLICY table_select_admin_policy ON table_name
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.supabase_user_id = auth.uid()
          AND public.user_has_role(u.id, 'admin')
      )
    );
`);

// 4. INSERT, UPDATE, DELETE policies
await queryRunner.query(`
  CREATE POLICY table_insert_policy ON table_name
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.supabase_user_id = auth.uid()
          AND (public.user_has_role(u.id, 'admin') OR public.user_has_permission(u.id, 'table:create'))
      )
    );
`);

// In migration down() method:
await queryRunner.query(`DROP POLICY IF EXISTS table_delete_policy ON table_name;`);
await queryRunner.query(`DROP POLICY IF EXISTS table_update_policy ON table_name;`);
await queryRunner.query(`DROP POLICY IF EXISTS table_insert_policy ON table_name;`);
await queryRunner.query(`DROP POLICY IF EXISTS table_select_admin_policy ON table_name;`);
await queryRunner.query(`DROP POLICY IF EXISTS table_select_policy ON table_name;`);
await queryRunner.query(`DROP FUNCTION IF EXISTS public.user_has_permission(UUID, TEXT);`);
await queryRunner.query(`DROP FUNCTION IF EXISTS public.user_has_role(UUID, TEXT);`);
await queryRunner.query(`ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;`);
```

### RLS Naming Conventions

**Policies:**
- `{table}_select_policy` - Basic SELECT for authenticated users
- `{table}_select_admin_policy` - Admin SELECT (view all)
- `{table}_insert_policy` - INSERT permissions
- `{table}_update_policy` - UPDATE permissions
- `{table}_delete_policy` - DELETE permissions

**Permissions:**
- `{resource}:create` (e.g., `organizations:create`)
- `{resource}:read`
- `{resource}:update`
- `{resource}:delete`

### Testing RLS Policies

```sql
-- Test as specific user (in psql or DB client)
SET LOCAL auth.uid = 'user-supabase-uuid-here';
SELECT * FROM table_name; -- Should only see allowed rows

-- Reset to default
RESET auth.uid;
```

**Reference Implementation:** See `1768105009236-CreateOrganizationsTable.ts` for complete RLS example.

---

## Environment Variables

Required variables (see `.env.example`):
- **Supabase (NEW API Keys - NOT Legacy!):**
  - `SUPABASE_URL` - Project URL
  - `SUPABASE_PUBLISHABLE_KEY` - Publishable key (sb_publishable_...)
  - `SUPABASE_SECRET_KEY` - Secret key (sb_secret_...)
  - `SUPABASE_JWT_SECRET` - JWT Signing Key (ECC P-256)
- **Database:** `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- **JWT Backend:** `JWT_SECRET` (min 32 chars), `JWT_ACCESS_TOKEN_EXPIRATION`, `JWT_REFRESH_TOKEN_EXPIRATION`
- **Email:** `RESEND_API_KEY`, `EMAIL_FROM`

---

## API Documentation

Swagger UI available at: `http://localhost:3000/api/docs`

**Endpoints:**
- **Auth:** `/auth/send-magic-link`, `/auth/callback`, `/auth/refresh`, `/auth/logout`, `/auth/me`
- **Users:** `/users` (CRUD with pagination)
- **Roles:** `/roles` (Role management)
- **Files:** `/files/upload`, `/files/:id`
- **Emails:** Email notification system

---

## Guards & Decorators

**Guards:**
- `JwtAuthGuard` - Global guard (applied to all routes except `@Public()`)
- `RolesGuard` - Check user roles with `@Roles('admin', 'moderator')`

**Decorators:**
- `@Public()` - Skip JWT authentication
- `@CurrentUser()` - Inject authenticated user
- `@CurrentUser('id')` - Inject specific user property
- `@Roles(...roles)` - Require specific roles

**Example:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin-only')
async adminRoute(@CurrentUser() user: UserPayload) {
  return { user };
}
```

---

## Key Design Decisions

1. **Request-Scoped Supabase**: Prevents session leakage between requests
2. **Dual Database**: Supabase Auth + TypeORM for application data
3. **Token Rotation**: Refresh tokens rotated on every refresh for security
4. **Soft Deletes**: Users can be soft-deleted with `deletedAt` timestamp
5. **JSONB Columns**: Flexible storage for `preferences` and `metadata`
6. **Symbol Injection**: Type-safe dependency injection without circular dependencies
7. **Global Guards**: JWT auth by default, opt-out with `@Public()`

---

## Development Workflow

1. **Adding Feature**: Create module structure → Domain → Application (+ tests) → Infrastructure → Presentation
2. **Testing**: Write tests alongside code, run `npm run test:watch`
3. **Code Quality**: Run `npm run lint && npm run format` before commits
4. **Database Changes**: Create migration → Run → Commit migration file
5. **Building**: `npm run build` to verify compilation

---

## Common Patterns

**Create Use Case with Test:**
```typescript
// create-entity.use-case.ts
@Injectable()
export class CreateEntityUseCase {
  constructor(@Inject(ENTITY_REPOSITORY) private repo: IEntityRepository) {}
  async execute(dto: CreateDto): Promise<Entity> {
    return this.repo.create(Entity.create(dto));
  }
}

// create-entity.use-case.spec.ts
describe('CreateEntityUseCase', () => {
  let useCase: CreateEntityUseCase;
  let mockRepo: jest.Mocked<IEntityRepository>;

  beforeEach(async () => {
    mockRepo = { create: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        CreateEntityUseCase,
        { provide: ENTITY_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();
    useCase = module.get(CreateEntityUseCase);
  });

  it('should create entity', async () => {
    mockRepo.create.mockResolvedValue(mockEntity);
    const result = await useCase.execute(dto);
    expect(result).toEqual(mockEntity);
  });
});
```

---

## Troubleshooting

**TypeScript Errors:**
- `TS1272`: Use `import type { Interface }` for interfaces in decorators
- `TS4094`: Don't expose complex objects in getters - create wrapper methods

**Build Fails:**
- Check all imports are correct
- Verify `.env` has required variables
- Run `npm run lint` to catch issues

**Tests Fail:**
- Update mocks to match service methods (not `.auth.method`)
- Verify repository interfaces are properly mocked
- Check ConfigService mocks return expected values

---

## Security Notes

- JWT tokens: 15min access, 7d refresh (configurable)
- Refresh tokens stored in whitelist (sessions table)
- Rate limiting: 10 requests/minute
- Password-less authentication via Magic Link
- CORS configured for frontend
- Security headers applied globally

---

## Next Steps

To expand this boilerplate:
1. Add more use cases to Roles/Files/Emails modules
2. Implement permission-based guards
3. Add file upload controller with validation
4. Create email templates system
5. Add logging with Winston
6. Implement caching with Redis
7. Add monitoring and health checks
8. Configure CI/CD pipeline
