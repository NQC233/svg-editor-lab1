export class GeometrySnapshot {
  public constructor(private readonly restoreValue: () => void) {}

  public restore(): void {
    this.restoreValue();
  }
}
