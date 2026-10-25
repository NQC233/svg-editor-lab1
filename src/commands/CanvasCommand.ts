import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { NumberParser } from '../shared/NumberParser.js';
import { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';

export class CanvasCommand extends Command {
  public execute(context: CommandContext, args: readonly string[]): readonly string[] {
    const document = context.requireDocument();

    if (args.length === 0) {
      return [
        `canvas ${NumberFormatter.format(document.width)}x${NumberFormatter.format(document.height)}`,
      ];
    }

    if (args.length === 1) {
      throw new DomainError('canvas requires both width and height');
    }

    if (args.length > 2) {
      throw new DomainError('usage: canvas [w] [h]');
    }

    const widthToken = args[0];
    const heightToken = args[1];
    if (widthToken === undefined || heightToken === undefined) {
      throw new DomainError('canvas requires both width and height');
    }

    const width = NumberParser.parse(widthToken);
    const height = NumberParser.parse(heightToken);
    if (width <= 0 || height <= 0) {
      throw new DomainError('canvas width and height must be positive');
    }

    document.resize(width, height);

    return [`canvas resized to ${NumberFormatter.format(width)}x${NumberFormatter.format(height)}`];
  }
}
