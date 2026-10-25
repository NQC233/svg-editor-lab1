// Terminal column width for the Unicode graphemes allowed in shape ids.
export class DisplayWidth {
  private static readonly segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  private static readonly markPattern = /^\p{Mark}$/u;

  public static measure(value: string): number {
    let width = 0;
    for (const { segment } of DisplayWidth.segmenter.segment(value)) {
      width += DisplayWidth.measureGrapheme(segment);
    }

    return width;
  }

  public static padEnd(value: string, targetWidth: number): string {
    return `${value}${' '.repeat(Math.max(0, targetWidth - DisplayWidth.measure(value)))}`;
  }

  private static measureGrapheme(grapheme: string): number {
    const codePoints = Array.from(grapheme, (character) => character.codePointAt(0) ?? 0);
    if (
      codePoints.some(
        (codePoint) =>
          DisplayWidth.isRegionalIndicator(codePoint) ||
          DisplayWidth.isEmoji(codePoint) ||
          codePoint === 0xfe0f,
      )
    ) {
      return 2;
    }

    if (codePoints.some((codePoint) => DisplayWidth.isHangulJamo(codePoint))) {
      return 2;
    }

    return codePoints.reduce((width, codePoint) => {
      if (DisplayWidth.isZeroWidth(codePoint)) {
        return width;
      }

      return width + (DisplayWidth.isWide(codePoint) ? 2 : 1);
    }, 0);
  }

  private static isZeroWidth(codePoint: number): boolean {
    return (
      codePoint === 0x200d ||
      DisplayWidth.markPattern.test(String.fromCodePoint(codePoint)) ||
      codePoint < 0x20 ||
      (codePoint >= 0x7f && codePoint < 0xa0) ||
      (codePoint >= 0x0300 && codePoint <= 0x036f) ||
      (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
      (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
      (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
      (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
      (codePoint >= 0xfe20 && codePoint <= 0xfe2f) ||
      (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff)
    );
  }

  private static isWide(codePoint: number): boolean {
    return (
      (codePoint >= 0x1100 && codePoint <= 0x115f) ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
      (codePoint >= 0x20000 && codePoint <= 0x3fffd)
    );
  }

  private static isEmoji(codePoint: number): boolean {
    return codePoint >= 0x1f300 && codePoint <= 0x1faff;
  }

  private static isRegionalIndicator(codePoint: number): boolean {
    return codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
  }

  private static isHangulJamo(codePoint: number): boolean {
    return codePoint >= 0x1100 && codePoint <= 0x11ff;
  }
}
