export class CommandToken {
  private readonly valueText: string;
  private readonly quotedValue: boolean;

  public constructor(value: string, quoted = false) {
    this.valueText = value;
    this.quotedValue = quoted;
  }

  public get value(): string {
    return this.valueText;
  }

  public get quoted(): boolean {
    return this.quotedValue;
  }
}
