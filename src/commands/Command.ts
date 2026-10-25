import type { CommandKind } from './CommandKind.js';
import type { CommandContext } from './CommandContext.js';
import type { CommandResult } from './CommandResult.js';

export abstract class Command {
  public abstract get kind(): CommandKind;

  public abstract execute(context: CommandContext, args: readonly string[]): CommandResult;
}
