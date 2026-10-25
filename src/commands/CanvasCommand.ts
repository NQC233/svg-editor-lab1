import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';

export class CanvasCommand extends Command {
  public execute(context: CommandContext, args: readonly string[]): CommandResult {
    const document = context.requireDocument();

    if (args.length === 0) {
      return new CommandResult(
        [
          `canvas ${NumberFormatter.format(document.width)}x${NumberFormatter.format(document.height)}`,
        ],
        false,
      );
    }

    if (args.length === 1) {
      throw new DomainError('canvas requires both width and height');
    }

    if (args.length > 2) {
      throw new DomainError('usage: canvas [w] [h]');
    }

    throw new DomainError('canvas resizing is not available yet');
  }
}
