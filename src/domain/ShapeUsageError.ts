import { DomainError } from '../shared/DomainError.js';

export class ShapeUsageError extends DomainError {
  public constructor(public readonly syntax: string) {
    super(`invalid shape arguments; usage: ${syntax}`);
  }
}
