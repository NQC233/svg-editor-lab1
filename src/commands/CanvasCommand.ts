import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { NumberParser } from '../shared/NumberParser.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { DocumentCommand } from './DocumentCommand.js';

export class CanvasCommand extends DocumentCommand {
  public execute(context: CommandContext, args: CommandArguments): CommandResult {
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

    const widthToken = args.value(0);
    const heightToken = args.value(1);
    if (widthToken === undefined || heightToken === undefined) {
      throw new DomainError('canvas requires both width and height');
    }

    const width = NumberParser.parse(widthToken);
    const height = NumberParser.parse(heightToken);
    document.resize(width, height);
    return new CommandResult([
      `canvas resized to ${NumberFormatter.format(width)}x${NumberFormatter.format(height)}`,
    ]);
  }
}
