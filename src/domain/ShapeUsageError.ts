import { DomainError } from '../shared/DomainError.js';

export class ShapeUsageError extends DomainError {
  private readonly syntaxValue: string;

  public constructor(syntax: string) {
    super(`invalid shape arguments; usage: ${syntax}`);
    this.syntaxValue = syntax;
  }

  public get syntax(): string {
    return this.syntaxValue;
  }
}
