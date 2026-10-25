import type { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';
import { DocumentCommand } from './DocumentCommand.js';
import { EditCommand } from './EditCommand.js';

export class CommandInvoker {
  public constructor(private readonly context: CommandContext) {}

  public execute(command: Command, args: readonly string[]): readonly string[] {
    const result = command.execute(this.context, args);
    if (result.changed) {
      if (command instanceof DocumentCommand) {
        this.context.history.clearAndLock();
      } else if (command instanceof EditCommand) {
        this.context.history.record(command);
      }
    }

    return result.output;
  }
}
