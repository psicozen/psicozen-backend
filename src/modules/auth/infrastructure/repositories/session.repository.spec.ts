import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SessionRepository } from './session.repository';
import { SessionSchema } from '../persistence/session.schema';
import { SessionEntity } from '../../domain/entities/session.entity';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let typeOrmRepository: jest.Mocked<Repository<SessionSchema>>;

  beforeEach(async () => {
    const mockTypeOrmRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionRepository,
        {
          provide: getRepositoryToken(SessionSchema),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<SessionRepository>(SessionRepository);
    typeOrmRepository = module.get(getRepositoryToken(SessionSchema));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByToken', () => {
    it('should find session by refresh token', async () => {
      const mockSchema = {
        id: 'session-123',
        userId: 'user-123',
        refreshToken: 'token-abc',
        expiresAt: new Date(),
        isValid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      typeOrmRepository.findOne.mockResolvedValue(mockSchema as SessionSchema);

      const result = await repository.findByToken('token-abc');

      expect(result).toBeInstanceOf(SessionEntity);
      expect(result?.refreshToken).toBe('token-abc');
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { refreshToken: 'token-abc' },
      });
    });

    it('should return null when session not found', async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByToken('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findActiveByUserId', () => {
    it('should find all active sessions for user', async () => {
      const mockSchemas = [
        {
          id: 'session-1',
          userId: 'user-123',
          refreshToken: 'token-1',
          isValid: true,
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'session-2',
          userId: 'user-123',
          refreshToken: 'token-2',
          isValid: true,
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      typeOrmRepository.find.mockResolvedValue(mockSchemas as SessionSchema[]);

      const result = await repository.findActiveByUserId('user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(SessionEntity);
      expect(typeOrmRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123', isValid: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('revokeAllByUserId', () => {
    it('should revoke all sessions for user', async () => {
      typeOrmRepository.update.mockResolvedValue({} as any);

      await repository.revokeAllByUserId('user-123');

      expect(typeOrmRepository.update).toHaveBeenCalledWith(
        { userId: 'user-123' },
        { isValid: false },
      );
    });
  });

  describe('revokeByToken', () => {
    it('should revoke session by token', async () => {
      typeOrmRepository.update.mockResolvedValue({} as any);

      await repository.revokeByToken('token-abc');

      expect(typeOrmRepository.update).toHaveBeenCalledWith(
        { refreshToken: 'token-abc' },
        { isValid: false },
      );
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired sessions', async () => {
      typeOrmRepository.delete.mockResolvedValue({} as any);

      await repository.deleteExpired();

      expect(typeOrmRepository.delete).toHaveBeenCalledWith({
        expiresAt: expect.any(Object), // LessThan matcher
      });
    });
  });
});
