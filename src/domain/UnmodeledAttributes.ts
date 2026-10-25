import type { SvgAttribute } from './Shape.js';

export class UnmodeledAttributes {
  private readonly entriesValue: readonly SvgAttribute[];

  public constructor(entries: readonly SvgAttribute[] = []) {
    this.entriesValue = entries.map(([name, value]) => [name, value] as const);
  }

  public get entries(): readonly SvgAttribute[] {
    return [...this.entriesValue];
  }
}
