import { DomainException } from './domain.exception';

export class ValidationException extends DomainException {
  constructor(public readonly errors: Record<string, string[]>) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}
