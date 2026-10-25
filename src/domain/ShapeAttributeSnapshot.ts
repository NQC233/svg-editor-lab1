export class ShapeAttributeSnapshot {
  public constructor(
    private readonly attributeValue: string,
    private readonly changedValue: boolean,
    private readonly previousValueData: string | undefined,
    private readonly currentValueData: string,
    private readonly restoreValue: () => void,
  ) {}

  public get attribute(): string {
    return this.attributeValue;
  }

  public get changed(): boolean {
    return this.changedValue;
  }

  public get previousValue(): string | undefined {
    return this.previousValueData;
  }

  public get currentValue(): string {
    return this.currentValueData;
  }

  public restore(): void {
    this.restoreValue();
  }
}
