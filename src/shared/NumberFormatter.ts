export class NumberFormatter {
  public static format(value: number): string {
    return Object.is(value, -0) ? '0' : String(value);
  }
}
