import { EmailsModule } from './emails.module';
import { EmailService } from './infrastructure/services/email.service';

describe('EmailsModule', () => {
  it('should be defined', () => {
    expect(EmailsModule).toBeDefined();
  });

  it('should have EmailService defined', () => {
    expect(EmailService).toBeDefined();
  });
});
