export class XmlText {
  public constructor(
    private readonly valueValue: string,
    private readonly cdataValue: boolean = false,
  ) {}

  public get value(): string {
    return this.valueValue;
  }

  public get cdata(): boolean {
    return this.cdataValue;
  }
}
