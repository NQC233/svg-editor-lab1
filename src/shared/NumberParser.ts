import { DomainError } from './DomainError.js';

export class NumberParser {
  private static readonly DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

  public static parse(value: string): number {
    if (!NumberParser.DECIMAL_PATTERN.test(value)) {
      throw new DomainError(`invalid number: ${value}`);
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new DomainError(`invalid number: ${value}`);
    }

    return number;
  }
}
