import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class MagicLinkThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Rate limit by email to prevent abuse of specific accounts
    const email = req.body?.email;
    return email ? `magic-link:${email}` : req.ip;
  }
}
