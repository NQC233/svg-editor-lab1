import type { SvgDocument } from '../domain/SvgDocument.js';

export class SvgReadResult {
  public constructor(
    private readonly documentValue: SvgDocument,
    private readonly elementCountValue: number,
    private readonly warningsValue: readonly string[] = [],
  ) {}

  public get document(): SvgDocument {
    return this.documentValue;
  }

  public get elementCount(): number {
    return this.elementCountValue;
  }

  public get warnings(): readonly string[] {
    return [...this.warningsValue];
  }
}
