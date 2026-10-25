import type { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';

export class CommandInvoker {
  public constructor(private readonly context: CommandContext) {}

  public execute(command: Command, args: readonly string[]): readonly string[] {
    return command.execute(this.context, args);
  }
}
