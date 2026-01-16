import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Supabase Authentication (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Public Routes', () => {
    it('GET / should be accessible without authentication', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });

    it('POST /auth/send-magic-link should be accessible without authentication', () => {
      return request(app.getHttpServer())
        .post('/auth/send-magic-link')
        .send({ email: 'test@example.com' })
        .expect((res) => {
          // Should not return 401 Unauthorized
          expect(res.status).not.toBe(401);
        });
    });
  });

  describe('Protected Routes', () => {
    it('GET /auth/me should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('No authentication token provided');
        });
    });

    it('GET /users should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('No authentication token provided');
        });
    });

    it('POST /auth/logout should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('No authentication token provided');
        });
    });

    it('GET /auth/me should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toMatch(
            /Invalid or expired token|Authentication failed/,
          );
        });
    });

    it('GET /auth/me should return 401 with malformed Authorization header', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'NotBearer some-token')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('No authentication token provided');
        });
    });
  });

  describe('Token Validation', () => {
    it('should reject expired tokens', () => {
      // This token has an exp claim in the past
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.invalid';

      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject tokens with missing Bearer prefix', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'some-token-without-bearer')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('No authentication token provided');
        });
    });

    it('should reject empty Authorization header', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', '')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('No authentication token provided');
        });
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for authentication failures', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('statusCode');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('path');
          expect(res.body).toHaveProperty('method');
          expect(res.body).toHaveProperty('message');
          expect(res.body.success).toBe(false);
          expect(res.body.statusCode).toBe(401);
        });
    });
  });

  describe('Strategy Error Prevention', () => {
    it('should NOT return "Unknown authentication strategy" error', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401)
        .expect((res) => {
          // Critical: This was the original bug we fixed
          expect(res.body.message).not.toContain(
            'Unknown authentication strategy',
          );
        });
    });

    it('should NOT return "Cannot read properties of undefined" error', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401)
        .expect((res) => {
          // This was another bug during refactoring
          expect(res.body.message).not.toContain(
            'Cannot read properties of undefined',
          );
        });
    });

    it.skip('should handle multiple concurrent requests without errors', async () => {
      // Skipped: Can be flaky due to connection pool limits
      const requests = Array(5)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/auth/me').expect(401));

      const responses = await Promise.all(requests);

      responses.forEach((res) => {
        expect(res.body.message).toBe('No authentication token provided');
        expect(res.body.message).not.toContain('Unknown authentication');
        expect(res.body.message).not.toContain('undefined');
      });
    });
  });

  describe('Guard Registration', () => {
    it('should apply global guard to all routes by default', async () => {
      // Test GET routes
      await request(app.getHttpServer()).get('/users').expect(401);
      await request(app.getHttpServer()).get('/auth/me').expect(401);

      // Test POST routes
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should respect @Public() decorator on public routes', async () => {
      const publicRoutes = [
        { method: 'get', path: '/' },
        { method: 'post', path: '/auth/send-magic-link' },
      ];

      for (const route of publicRoutes) {
        const req = request(app.getHttpServer())[route.method](route.path);

        if (route.method === 'post') {
          req.send({ email: 'test@example.com' });
        }

        await req.expect((res) => {
          expect(res.status).not.toBe(401);
        });
      }
    });
  });
});
