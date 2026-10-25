export class SvgMetadata {
  private static readonly IGNORED_ELEMENTS = new Set(['title', 'desc', 'metadata']);

  public static isIgnoredElement(name: string): boolean {
    return SvgMetadata.IGNORED_ELEMENTS.has(name);
  }
}
