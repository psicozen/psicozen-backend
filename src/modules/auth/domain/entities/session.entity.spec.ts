import { SessionEntity } from './session.entity';

describe('SessionEntity', () => {
  describe('create', () => {
    it('should create a valid session', () => {
      const userId = 'user-123';
      const refreshToken = 'refresh-token-abc';
      const expiresInSeconds = 604800; // 7 days

      const session = SessionEntity.create(
        userId,
        refreshToken,
        expiresInSeconds,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(session.userId).toBe(userId);
      expect(session.refreshToken).toBe(refreshToken);
      expect(session.ipAddress).toBe('127.0.0.1');
      expect(session.userAgent).toBe('Mozilla/5.0');
      expect(session.isValid).toBe(true);
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.createdAt).toBeInstanceOf(Date);
    });

    it('should create session without IP and User-Agent', () => {
      const session = SessionEntity.create('user-123', 'token', 3600);

      expect(session.ipAddress).toBeUndefined();
      expect(session.userAgent).toBeUndefined();
      expect(session.isValid).toBe(true);
    });

    it('should set correct expiration time', () => {
      const now = new Date();
      const expiresInSeconds = 3600; // 1 hour

      const session = SessionEntity.create('user-123', 'token', expiresInSeconds);

      const expectedExpiration = new Date(now.getTime() + expiresInSeconds * 1000);
      const timeDiff = Math.abs(session.expiresAt.getTime() - expectedExpiration.getTime());

      expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
    });
  });

  describe('isExpired', () => {
    it('should return true when session is expired', () => {
      const session = new SessionEntity({
        expiresAt: new Date('2020-01-01'),
        isValid: true,
      });

      expect(session.isExpired()).toBe(true);
    });

    it('should return false when session is not expired', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const session = new SessionEntity({
        expiresAt: futureDate,
        isValid: true,
      });

      expect(session.isExpired()).toBe(false);
    });
  });

  describe('revoke', () => {
    it('should revoke session and update timestamp', () => {
      const session = new SessionEntity({
        isValid: true,
        updatedAt: new Date('2023-01-01'),
      });

      const beforeRevoke = session.updatedAt;
      session.revoke();

      expect(session.isValid).toBe(false);
      expect(session.updatedAt.getTime()).toBeGreaterThan(beforeRevoke.getTime());
    });

    it('should allow revoking already revoked session', () => {
      const session = new SessionEntity({ isValid: false });

      session.revoke();

      expect(session.isValid).toBe(false);
    });
  });
});
