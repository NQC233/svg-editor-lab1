export class ShapeAttributeSnapshot {
  public constructor(
    private readonly attributeValue: string,
    private readonly changedValue: boolean,
    private readonly previousValue: string | undefined,
    private readonly currentValue: string,
    private readonly restoreValue: () => void,
  ) {}

  public get attribute(): string {
    return this.attributeValue;
  }

  public get changed(): boolean {
    return this.changedValue;
  }

  public get updatedDescription(): string {
    return `${this.attributeValue}=${this.currentValue}`;
  }

  public get restoredDescription(): string {
    return `${this.attributeValue}=${this.previousValue ?? '(unset)'}`;
  }

  public restore(): void {
    this.restoreValue();
  }
}
