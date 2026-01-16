import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { runInTransaction } from '../../infrastructure/database/rls.storage';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class RlsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RlsMiddleware.name);
  private readonly jwtSecret: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('SUPABASE_JWT_SECRET')!;
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract user ID from Supabase token if present, but don't fail if not
    // We do manual extraction because Guards run AFTER middleware, so user is not yet attached to request
    let userId: string | null = null;

    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        // Decode without verification (verification happens in SupabaseAuthGuard)
        const payload = jwt.decode(token) as any;
        if (payload && payload.sub) {
          userId = payload.sub;
        }
      } catch (e) {
        // Ignore token errors here, Guards will handle auth validation
      }
    }

    // Only create RLS context if we have a user
    if (userId) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Set the RLS context variable
        // This MUST match what the policies check (auth.uid() usually checks request.jwt.claim.sub)
        // Adjust this based on your specific Postgres configuration/function
        // Since we are setting it manually, we can use a custom setting like 'app.current_user_id'
        // IF the policy reads that.

        // HOWEVER, Supabase standard `auth.uid()` uses `request.jwt.claim.sub`.
        await queryRunner.query(
          `SELECT set_config('request.jwt.claim.sub', '${userId}', true)`,
        );

        // Run the rest of the request within this transaction context
        await runInTransaction(queryRunner.manager, async () => {
          // We need to wait for the request to complete
          // Problem: Middleware 'next()' is synchronous-ish in Express, doesn't return the promise chain of the controller.
          // BUT: NestJS middleware CAN handle async if we await next()? No, next() returns void.

          // CRITICAL ISSUE:
          // Express middleware next() chain is not a Promise that resolves when the request is done.
          // So we cannot "wrap" the request in a transaction and commit at the end of the request using just middleware this way.
          // The database connection needs to be kept open during the request processing.

          // SOLUTION:
          // We can use the AsyncLocalStorage to store the manager.
          // But managing the Transaction Lifecycle (Commit/Rollback) is hard in Middleware.

          // Alternative: Interceptor?
          // Interceptors wrap the execution handler and DO return a stream/promise.
          // However, Guards run BEFORE Interceptors. If Guards access DB, they might fail RLS if not set.
          // But usually Guards read Users table to Validate. Users table might have RLS.

          // If we use Middleware, we can't easily auto-commit/rollback at end of request.
          // Unless we hook into `res.on('finish')`?

          // Let's implement the `res.on('finish')` approach to handle commit/release.

          return new Promise<void>((resolve) => {
            res.on('finish', async () => {
              try {
                if (res.statusCode >= 400) {
                  await queryRunner.rollbackTransaction();
                } else {
                  await queryRunner.commitTransaction();
                }
              } catch (err) {
                this.logger.error('Error finishing RLS transaction', err);
              } finally {
                await queryRunner.release();
                resolve();
              }
            });

            // Proceed with request
            next();
          });
        });
      } catch (err) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        throw err;
      }
    } else {
      next();
    }
  }
}
