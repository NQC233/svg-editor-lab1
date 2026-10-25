import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import type { CommandResult } from './CommandResult.js';

export abstract class Command {
  public abstract execute(context: CommandContext, args: CommandArguments): CommandResult;
}
