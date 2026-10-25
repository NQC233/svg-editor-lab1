export class ConsoleOutput {
  public constructor(private readonly stream: NodeJS.WritableStream) {}

  public writeLine(line: string): void {
    this.stream.write(`${line}\n`);
  }
}
