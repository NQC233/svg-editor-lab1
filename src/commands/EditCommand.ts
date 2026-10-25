import { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';
import type { CommandResult } from './CommandResult.js';

export abstract class EditCommand extends Command {
  public abstract undo(context: CommandContext): CommandResult;

  public abstract redo(context: CommandContext): CommandResult;
}
