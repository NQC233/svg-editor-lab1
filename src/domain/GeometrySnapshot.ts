export class GeometrySnapshot {
  public constructor(
    private readonly restoreValue: () => void,
    private readonly matchesCurrentValue: () => boolean,
  ) {}

  public restore(): void {
    this.restoreValue();
  }

  public matchesCurrent(): boolean {
    return this.matchesCurrentValue();
  }
}
