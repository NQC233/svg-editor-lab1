import type { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';
import { CommandKind } from './CommandKind.js';
import { EditCommand } from './EditCommand.js';

export class CommandInvoker {
  public constructor(private readonly context: CommandContext) {}

  public execute(command: Command, args: readonly string[]): readonly string[] {
    const result = command.execute(this.context, args);
    if (result.changed) {
      switch (command.kind) {
        case CommandKind.Document:
          this.context.history.clearAndLock();
          break;
        case CommandKind.Edit:
          if (command instanceof EditCommand) {
            this.context.history.record(command);
          }
          break;
        case CommandKind.Display:
        case CommandKind.History:
          break;
      }
    }

    return result.output;
  }
}
