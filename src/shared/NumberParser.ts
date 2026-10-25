import { DomainError } from './DomainError.js';

export class NumberParser {
  private static readonly DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

  public static parse(value: string): number {
    const normalized = value.trim();
    if (!NumberParser.DECIMAL_PATTERN.test(normalized)) {
      throw new DomainError(`invalid number: ${value}`);
    }

    const number = Number(normalized);
    if (!Number.isFinite(number)) {
      throw new DomainError(`invalid number: ${value}`);
    }

    return number;
  }
}
