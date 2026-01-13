import { UserSchema } from '../../src/modules/users/infrastructure/persistence/user.schema';
import { UserPreferences } from '../../src/modules/users/domain/entities/user.entity';

let fixtureCounter = 0;

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: 'en',
  theme: 'system',
  notifications: true,
  timezone: 'UTC',
};

function generateTestId(): string {
  fixtureCounter++;
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const counter = fixtureCounter.toString(16).padStart(4, '0');
  const random = Math.random().toString(16).substring(2, 10);
  return `${timestamp.substring(0, 8)}-${timestamp.substring(8, 12)}-4000-8000-${counter}${random}`;
}

export interface CreateUserFixtureOptions {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  bio?: string;
  supabaseUserId?: string;
  isActive?: boolean;
  lastLoginAt?: Date;
}

/**
 * Creates a user fixture with default or custom values
 * @param options - Optional configuration for the user
 * @returns Partial UserSchema object ready for database insertion
 */
export function createUserFixture(
  options: CreateUserFixtureOptions = {},
): Partial<UserSchema> {
  const id = options.id ?? generateTestId();
  const email = options.email ?? `user${fixtureCounter}@test.com`.toLowerCase();
  const firstName = options.firstName ?? `Test${fixtureCounter}`;
  const lastName = options.lastName ?? `User`;

  return {
    id,
    email,
    firstName,
    lastName,
    photoUrl: options.photoUrl,
    bio: options.bio,
    preferences: DEFAULT_USER_PREFERENCES,
    supabaseUserId: options.supabaseUserId,
    isActive: options.isActive ?? true,
    lastLoginAt: options.lastLoginAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Creates a set of users for role assignment testing
 * @returns Object with 3 pre-configured users
 */
export function createUsersForRoleTesting(): {
  user1: Partial<UserSchema>;
  user2: Partial<UserSchema>;
  user3: Partial<UserSchema>;
} {
  const user1 = createUserFixture({
    email: 'admin.user@test.com',
    firstName: 'Admin',
    lastName: 'User',
  });

  const user2 = createUserFixture({
    email: 'gestor.user@test.com',
    firstName: 'Gestor',
    lastName: 'User',
  });

  const user3 = createUserFixture({
    email: 'colaborador.user@test.com',
    firstName: 'Colaborador',
    lastName: 'User',
  });

  return { user1, user2, user3 };
}

/**
 * Resets the fixture counter (useful between test suites)
 */
export function resetUserFixtureCounter(): void {
  fixtureCounter = 0;
}
