export class CommandResult {
  public constructor(
    private readonly outputValue: readonly string[],
    private readonly changedValue: boolean = true,
  ) {}

  public get output(): readonly string[] {
    return this.outputValue;
  }

  public get changed(): boolean {
    return this.changedValue;
  }
}
