import { UserEntity } from './user.entity';

describe('UserEntity', () => {
  describe('create', () => {
    it('should create user with default preferences', () => {
      const email = 'test@example.com';
      const user = UserEntity.create(email);

      expect(user.email).toBe(email);
      expect(user.isActive).toBe(true);
      expect(user.preferences).toEqual({
        language: 'en',
        theme: 'system',
        notifications: true,
        timezone: 'UTC',
      });
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create user with supabaseUserId and firstName', () => {
      const user = UserEntity.create(
        'test@example.com',
        'supabase-123',
        'John',
      );

      expect(user.supabaseUserId).toBe('supabase-123');
      expect(user.firstName).toBe('John');
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields', () => {
      const user = UserEntity.create('test@example.com');

      user.updateProfile({
        firstName: 'Jane',
        lastName: 'Doe',
        bio: 'Software developer',
        photoUrl: 'https://example.com/photo.jpg',
      });

      expect(user.firstName).toBe('Jane');
      expect(user.lastName).toBe('Doe');
      expect(user.bio).toBe('Software developer');
      expect(user.photoUrl).toBe('https://example.com/photo.jpg');
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow partial updates', () => {
      const user = UserEntity.create('test@example.com', undefined, 'John');

      user.updateProfile({ lastName: 'Smith' });

      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Smith');
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences and preserve existing values', () => {
      const user = UserEntity.create('test@example.com');

      user.updatePreferences({ theme: 'dark', language: 'pt' });

      expect(user.preferences.theme).toBe('dark');
      expect(user.preferences.language).toBe('pt');
      expect(user.preferences.notifications).toBe(true); // preserved
      expect(user.preferences.timezone).toBe('UTC'); // preserved
    });
  });

  describe('recordLogin', () => {
    it('should update lastLoginAt timestamp', () => {
      const user = UserEntity.create('test@example.com');
      expect(user.lastLoginAt).toBeUndefined();

      user.recordLogin();

      expect(user.lastLoginAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', () => {
      const user = UserEntity.create('test@example.com');
      expect(user.isActive).toBe(true);

      user.deactivate();

      expect(user.isActive).toBe(false);
    });
  });

  describe('activate', () => {
    it('should set isActive to true', () => {
      const user = UserEntity.create('test@example.com');
      user.isActive = false;

      user.activate();

      expect(user.isActive).toBe(true);
    });
  });
});
