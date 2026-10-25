export class ConsoleOutput {
  public constructor(private readonly streamValue: NodeJS.WritableStream) {}

  public get stream(): NodeJS.WritableStream {
    return this.streamValue;
  }

  public writeLine(line: string): void {
    this.streamValue.write(`${line}\n`);
  }
}
