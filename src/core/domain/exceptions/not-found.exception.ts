import { DomainException } from './domain.exception';

export class NotFoundException extends DomainException {
  constructor(entityName: string, identifier: string) {
    super(`${entityName} with identifier ${identifier} not found`);
    this.name = 'NotFoundException';
  }
}
