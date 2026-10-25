import type { SvgDocument } from '../domain/SvgDocument.js';

export class SvgReadResult {
  public constructor(
    private readonly documentValue: SvgDocument,
    private readonly elementCountValue: number,
  ) {}

  public get document(): SvgDocument {
    return this.documentValue;
  }

  public get elementCount(): number {
    return this.elementCountValue;
  }
}
