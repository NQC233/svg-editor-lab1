import type { CommandToken } from './CommandToken.js';

export class CommandArguments {
  public constructor(private readonly tokens: readonly CommandToken[]) {}

  public get length(): number {
    return this.tokens.length;
  }

  public get(index: number): CommandToken | undefined {
    return this.tokens[index];
  }

  public value(index: number): string | undefined {
    return this.get(index)?.value;
  }

  public values(): readonly string[] {
    return this.tokens.map((token) => token.value);
  }

  public slice(start: number, end?: number): CommandArguments {
    return new CommandArguments(this.tokens.slice(start, end));
  }
}
