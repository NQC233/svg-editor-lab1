import { Command } from './Command.js';
import { CommandKind } from './CommandKind.js';
import type { CommandContext } from './CommandContext.js';
import type { CommandResult } from './CommandResult.js';

export abstract class EditCommand extends Command {
  public override get kind(): CommandKind {
    return CommandKind.Edit;
  }

  public abstract undo(context: CommandContext): CommandResult;

  public abstract redo(context: CommandContext): CommandResult;
}
